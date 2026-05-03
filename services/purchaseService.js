const db = require('../database/db');

/**
 * Profesional Purchase Service
 * Tablas: purchases (cabecera), purchase_items (líneas)
 */
const PurchaseService = {
  /**
   * Registrar una compra de mercancía y actualizar stock
   */
  async createPurchase(purchaseData) {
    const { supplierId, userId, items, total, paymentMethod } = purchaseData;

    if (!items || items.length === 0) throw new Error("La compra debe tener al menos un producto.");
    if (!supplierId) throw new Error("Debe seleccionar un proveedor.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const CoreService = require('./core');

      // 1. Insertar Cabecera de Compra (tabla: purchases)
      const headerResult = await CoreService.agregar('purchases', {
        supplier_id: supplierId,
        user_id: userId || null,
        total: total,
        payment_method: paymentMethod || 'Contado',
        pending_amount: (paymentMethod === 'Crédito') ? total : 0.00
      }, connection);
      const purchaseId = headerResult.insertId;

      // ✅ ACTUALIZAR DEUDA DEL PROVEEDOR SI ES CRÉDITO
      if (paymentMethod === 'Crédito') {
        await connection.execute(
          "UPDATE suppliers SET debt = debt + ? WHERE id = ?",
          [total, supplierId]
        );
      }

      // 2. Insertar Items y Actualizar Stock (tabla: purchase_items)
      for (const item of items) {
        if (!item.id) throw new Error("Producto inválido en la lista de compra.");

        await CoreService.agregar('purchase_items', {
          purchase_id: purchaseId,
          product_id: item.id,
          qty: item.quantity,
          unit_price: item.price,
          total: item.quantity * item.price
        }, connection);

        // Aumentar Stock y Actualizar Precios (Costo y Venta)
        await connection.execute(
          "UPDATE products SET quantity = quantity + ?, buy_price = ?, sale_price = ? WHERE id = ?",
          [item.quantity, item.price, item.sale_price, item.id]
        );

        // Registrar en Kardex
        await CoreService.agregar('inventory_movements', {
          product_id: item.id,
          type: 'IN',
          qty: item.quantity,
          reference: `Compra #${purchaseId}`,
          user_id: userId || null
        }, connection);
      }

      await connection.commit();
      return { success: true, purchaseId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtener historial de compras con filtros
   */
  async getAllPurchases(filters = {}) {
    const { search } = filters;
    let sql = `
      SELECT p.id, p.total, DATE_FORMAT(p.date, '%Y-%m-%d %H:%i') as date,
             s.name as supplier_name,
             u.username as user_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += " AND (s.name LIKE ? OR p.id = ?)";
      params.push(`%${search}%`, search);
    }
    
    sql += " ORDER BY p.date DESC";
    
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  /**
   * Obtener detalle de una compra específica
   */
  async getPurchaseDetails(purchaseId) {
    if (!purchaseId) throw new Error("ID de compra requerido");
    
    const [header] = await db.execute(`
      SELECT p.id, p.total, DATE_FORMAT(p.date, '%Y-%m-%d %H:%i') as date, 
             s.name as supplier_name, u.username as user_name 
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [purchaseId]);
    
    if (header.length === 0) throw new Error("Compra no encontrada");
    
    const [items] = await db.execute(`
      SELECT pi.*, pr.name as product_name
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
    `, [purchaseId]);
    
    return { header: header[0], items };
  },

  /**
   * Actualizar una compra (Solo cabecera, ya que cambiar items afectaría stock)
   */
  async updatePurchase(id, data) {
    const { supplierId, total } = data;
    if (!id) throw new Error("ID de compra requerido.");
    
    let updates = [];
    let params = [];
    if (supplierId) { updates.push("supplier_id = ?"); params.push(supplierId); }
    if (total !== undefined) { updates.push("total = ?"); params.push(total); }
    
    if (updates.length === 0) return { success: false, msg: "No hay cambios." };
    
    const sql = `UPDATE purchases SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);
    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Eliminar una compra SIN revertir el stock (el stock permanece intacto)
   */
  async deletePurchase(purchaseId) {
    if (!purchaseId) throw new Error("ID de compra requerido.");
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 0. Obtener info de la compra antes de borrar
      const [existing] = await connection.execute("SELECT * FROM purchases WHERE id = ?", [purchaseId]);
      if (existing.length === 0) throw new Error("Compra no encontrada.");

      // 1. Borrar items de compra
      await connection.execute("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId]);
      
      // 2. Borrar cabecera de compra
      const [result] = await connection.execute("DELETE FROM purchases WHERE id = ?", [purchaseId]);
      
      // 3. Restaurar deuda del proveedor si era crédito
      if (existing[0].payment_method === 'Crédito' && existing[0].supplier_id) {
        await connection.execute(
          "UPDATE suppliers SET debt = debt - ? WHERE id = ?",
          [existing[0].total, existing[0].supplier_id]
        );
      }

      await connection.commit();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = PurchaseService;
