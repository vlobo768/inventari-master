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

      // 1. Insertar Cabecera de Venta
      const [headerResult] = await connection.execute(
        "INSERT INTO sales_header (customer_id, user_id, total, payment_method) VALUES (?, ?, ?, ?)",
        [customerId || null, userId || null, total, paymentMethod || 'Efectivo']
      );
      const saleId = headerResult.insertId;

      // 2. Insertar Items y Actualizar Stock
      for (const item of items) {
        await connection.execute(
          "INSERT INTO sales_items (sale_id, product_id, qty, unit_price, total) VALUES (?, ?, ?, ?, ?)",
          [saleId, item.id, item.quantity, item.price, item.quantity * item.price]
        );

        // Descontar stock (con validación de suficiencia)
        const [prodResult] = await connection.execute(
          "UPDATE products SET quantity = quantity - ? WHERE id = ? AND quantity >= ?",
          [item.quantity, item.id, item.quantity]
        );

        if (prodResult.affectedRows === 0) {
          throw new Error(`Stock insuficiente para el producto ID ${item.id}`);
        }

        // Registrar en Kardex
        await connection.execute(
          "INSERT INTO inventory_movements (product_id, type, qty, reference, user_id) VALUES (?, 'OUT', ?, ?, ?)",
          [item.id, item.quantity, `Venta #${saleId}`, userId || null]
        );
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
      SELECT s.id, s.total, s.date, s.payment_method, s.status,
             c.name as customer_name, u.username as seller_name
      FROM sales_header s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += " AND (c.name LIKE ? OR s.id = ?)";
      params.push(`%${search}%`, parseInt(search) || 0);
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

      // Marcar venta como cancelada
      await connection.execute(
        "UPDATE sales_header SET status = 'cancelled' WHERE id = ?",
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
  }
};

module.exports = SaleService;
