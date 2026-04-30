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
    const { supplierId, userId, items, total } = purchaseData;

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
        total: total
      }, connection);
      const purchaseId = headerResult.insertId;

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

        // Aumentar Stock
        await connection.execute(
          "UPDATE products SET quantity = quantity + ? WHERE id = ?",
          [item.quantity, item.id]
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
      SELECT p.id, p.total, DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as date,
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
    
    sql += " ORDER BY p.created_at DESC";
    
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  /**
   * Obtener detalle de una compra específica
   */
  async getPurchaseDetails(purchaseId) {
    if (!purchaseId) throw new Error("ID de compra requerido");
    
    const [header] = await db.execute(`
      SELECT p.id, p.total, DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i') as date, 
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
   * Eliminar una compra y revertir el stock
   */
  async deletePurchase(purchaseId) {
    if (!purchaseId) throw new Error("ID de compra requerido.");
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // 1. Obtener items para revertir stock
      const [items] = await connection.execute(
        "SELECT product_id, qty FROM purchase_items WHERE purchase_id = ?", 
        [purchaseId]
      );
      
      for (const item of items) {
        // Restar el stock que entró por la compra
        await connection.execute(
          "UPDATE products SET quantity = quantity - ? WHERE id = ?",
          [item.qty, item.product_id]
        );
        // Borrar movimiento de Kardex relacionado (opcional, o marcar como revertido)
        await connection.execute(
          "DELETE FROM inventory_movements WHERE product_id = ? AND reference = ?",
          [item.product_id, `Compra #${purchaseId}`]
        );
      }
      
      // 2. Borrar items de compra
      await connection.execute("DELETE FROM purchase_items WHERE purchase_id = ?", [purchaseId]);
      
      // 3. Borrar cabecera de compra
      const [result] = await connection.execute("DELETE FROM purchases WHERE id = ?", [purchaseId]);
      
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
