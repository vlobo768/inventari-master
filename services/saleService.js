const db = require('../database/db');

/**
 * Profesional Sales Service (POS)
 */
const SaleService = {
  /**
   * Registrar una venta completa (Header + Items) con transacción
   */
  async createSale(saleData) {
    const { customerId, userId, paymentMethod, items, total } = saleData;

    if (!items || items.length === 0) throw new Error("La venta debe tener al menos un producto.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const CoreService = require('./core');

      // 1. Insertar Cabecera de Venta
      const headerResult = await CoreService.agregar('sales_header', {
        customer_id: customerId || null,
        user_id: userId || null,
        total: total,
        payment_method: paymentMethod || 'Efectivo',
        pending_amount: (paymentMethod === 'Crédito') ? total : 0.00
      }, connection);
      const saleId = headerResult.insertId;

       // 2. Insertar Items y Actualizar Stock
       for (const item of items) {
         await CoreService.agregar('sales_items', {
           sale_id: saleId,
           product_id: item.id,
           qty: item.quantity,
           unit_price: item.price,
           total: item.quantity * item.price
         }, connection);
         
         // Descontar stock (con validación de suficiencia y precisión decimal)
         const [prodResult] = await connection.execute(
           "UPDATE products SET quantity = quantity - CAST(? AS DECIMAL(10,3)) WHERE id = ? AND quantity >= CAST(? AS DECIMAL(10,3))",
           [item.quantity, item.id, item.quantity]
         );
         
         if (prodResult.affectedRows === 0) {
           throw new Error(`Stock insuficiente para el producto ID ${item.id}`);
         }
         
         // Registrar en Kardex
         await CoreService.agregar('inventory_movements', {
           product_id: item.id,
           type: 'OUT',
           qty: item.quantity,
           reference: `Venta #${saleId}`,
           user_id: userId || null
         }, connection);
       }
       
       // ✅ VALIDACIÓN DE CRÉDITO MEJORADA: Usar deuda acumulada
       if (paymentMethod === 'Crédito' && customerId) {
         const [custRows] = await connection.execute(
           "SELECT credit_limit, debt FROM customers WHERE id = ?", 
           [customerId]
         );
         if (custRows.length > 0) {
           const limit = parseFloat(custRows[0].credit_limit) || 0;
           const currentDebt = parseFloat(custRows[0].debt) || 0;
           
           if (currentDebt + total > limit) {
             throw new Error(`Límite de crédito excedido. Disponible: $${(limit - currentDebt).toFixed(2)}, Total venta: $${total}`);
           }
           
           // Aumentar la deuda del cliente
           await connection.execute(
             "UPDATE customers SET debt = debt + ? WHERE id = ?",
             [total, customerId]
           );
         } else {
           throw new Error("Cliente no encontrado para validar crédito.");
         }
       }

       await connection.commit();
       return { success: true, saleId };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Listar ventas con filtros
   */
  async getAllSales(filters = {}) {
    const { search, startDate, endDate } = filters;
    let sql = `
      SELECT s.id, s.total, s.date, s.payment_method, s.status, s.pending_amount,
             c.name as customer_name, u.username as seller_name
      FROM sales_header s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += " AND (c.name LIKE ? OR s.id = ? OR s.date LIKE ?)";
      params.push(`%${search}%`, parseInt(search) || 0, `%${search}%`);
    }

    if (startDate && endDate) {
      sql += " AND DATE(s.date) BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }

    sql += " ORDER BY s.date DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  /**
   * Ventas del día actual
   */
  async getDailySales() {
    const [rows] = await db.execute(`
      SELECT s.id, s.total, s.date, s.payment_method,
             c.name as customer_name, u.username as seller_name
      FROM sales_header s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.date) = CURDATE()
      ORDER BY s.date DESC
    `);
    return rows;
  },

  /**
   * Ventas por rango de fechas
   */
  async getSalesByDateRange(startDate, endDate) {
    if (!startDate || !endDate) throw new Error("Fechas de inicio y fin son requeridas.");
    const [rows] = await db.execute(`
      SELECT s.id, s.total, s.date, s.payment_method,
             c.name as customer_name, u.username as seller_name
      FROM sales_header s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.date) BETWEEN ? AND ?
      ORDER BY s.date DESC
    `, [startDate, endDate]);
    return rows;
  },

  /**
   * Obtener detalle completo de una venta
   */
  async getSaleDetails(saleId) {
    const [header] = await db.execute(`
      SELECT s.*, c.name as customer_name, u.username as seller_name
      FROM sales_header s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [saleId]);
    if (header.length === 0) throw new Error("Venta no encontrada.");

    const [items] = await db.execute(`
      SELECT i.*, p.name as product_name
      FROM sales_items i
      JOIN products p ON i.product_id = p.id
      WHERE i.sale_id = ?
    `, [saleId]);

    return { header: header[0], items };
  },

  /**
   * Anular venta (soft delete: status = 'cancelled') y restaurar stock
   */
  async deleteSale(saleId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar que exista y no esté ya cancelada
      const [existing] = await connection.execute(
        "SELECT * FROM sales_header WHERE id = ?", [saleId]
      );
      if (existing.length === 0) throw new Error("Venta no encontrada.");
      if (existing[0].status === 'cancelled') throw new Error("La venta ya está anulada.");

      // Obtener items para restaurar stock
      const [items] = await connection.execute(
        "SELECT * FROM sales_items WHERE sale_id = ?", [saleId]
      );

      // Restaurar stock de cada producto
      for (const item of items) {
        await connection.execute(
          "UPDATE products SET quantity = quantity + ? WHERE id = ?",
          [item.qty, item.product_id]
        );
        // Registrar en Kardex
        await connection.execute(
          "INSERT INTO inventory_movements (product_id, type, qty, reference) VALUES (?, 'ADJUSTMENT', ?, ?)",
          [item.product_id, item.qty, `Anulación Venta #${saleId}`]
        );
      }

      // Restaurar crédito/deuda si era venta a crédito (evitando deuda negativa)
      if (existing[0].payment_method === 'Crédito' && existing[0].customer_id) {
        await connection.execute(
          "UPDATE customers SET debt = MAX(0, COALESCE(debt, 0) - ?) WHERE id = ?",
          [existing[0].total, existing[0].customer_id]
        );
      }

      // Marcar venta como cancelada y registrar fecha de anulación
      await connection.execute(
        "UPDATE sales_header SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?",
        [saleId]
      );

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Reporte analítico de ventas
   */
  async getSalesAnalytics(period = 'daily') {
    let sql = "";
    if (period === 'daily') {
      sql = `SELECT DATE(date) as date, SUM(total) as total_sales, COUNT(id) as num_sales
             FROM sales_header WHERE status != 'cancelled'
             GROUP BY DATE(date) ORDER BY DATE(date) DESC LIMIT 30`;
    } else {
      sql = `SELECT YEAR(date) as year, MONTH(date) as month_num,
                    MONTHNAME(date) as month, SUM(total) as total_sales, COUNT(id) as num_sales
             FROM sales_header WHERE status != 'cancelled'
             GROUP BY YEAR(date), MONTH(date) ORDER BY year DESC, month_num DESC LIMIT 12`;
    }
    const [rows] = await db.execute(sql);
    return rows;
  },

  /**
   * Eliminar definitivamente una venta que ya fue anulada
   */
  async purgeSale(saleId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar que exista
      const [existing] = await connection.execute(
        "SELECT status FROM sales_header WHERE id = ?", [saleId]
      );
      if (existing.length === 0) throw new Error("Venta no encontrada.");

      // Borrar items primero (por si no hay CASCADE)
      await connection.execute("DELETE FROM sales_items WHERE sale_id = ?", [saleId]);
      // Borrar cabecera
      await connection.execute("DELETE FROM sales_header WHERE id = ?", [saleId]);

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = SaleService;
