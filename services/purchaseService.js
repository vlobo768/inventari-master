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

      // 1. Insertar Cabecera de Compra (tabla: purchases)
      const [headerResult] = await connection.execute(
        "INSERT INTO purchases (supplier_id, user_id, total) VALUES (?, ?, ?)",
        [supplierId, userId || null, total]
      );
      const purchaseId = headerResult.insertId;

      // 2. Insertar Items y Actualizar Stock (tabla: purchase_items)
      for (const item of items) {
        if (!item.id) throw new Error("Producto inválido en la lista de compra.");

        await connection.execute(
          "INSERT INTO purchase_items (purchase_id, product_id, qty, unit_price, total) VALUES (?, ?, ?, ?, ?)",
          [purchaseId, item.id, item.quantity, item.price, item.quantity * item.price]
        );

        // Aumentar Stock
        await connection.execute(
          "UPDATE products SET quantity = quantity + ? WHERE id = ?",
          [item.quantity, item.id]
        );

        // Registrar en Kardex
        await connection.execute(
          "INSERT INTO inventory_movements (product_id, type, qty, reference, user_id) VALUES (?, 'IN', ?, ?, ?)",
          [item.id, item.quantity, `Compra #${purchaseId}`, userId || null]
        );
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
   * Listar todas las compras con JOIN a suppliers y users
   */
  async getAllPurchases(filters = {}) {
    const { search } = filters;
    let sql = `
      SELECT p.id, s.name as supplier_name, p.total, p.date, p.status,
             u.username as user_name
      FROM purchases p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += " AND (s.name LIKE ? OR p.id = ?)";
      params.push(`%${search}%`, parseInt(search) || 0);
    }

    sql += " ORDER BY p.date DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  /**
   * Detalle de una compra (header + items)
   */
  async getPurchaseDetails(purchaseId) {
    const [header] = await db.execute(
      `SELECT p.*, s.name as supplier_name, u.username as user_name
       FROM purchases p
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [purchaseId]
    );
    if (header.length === 0) throw new Error("Compra no encontrada.");

    const [items] = await db.execute(`
      SELECT pi.*, pr.name as product_name
      FROM purchase_items pi
      JOIN products pr ON pi.product_id = pr.id
      WHERE pi.purchase_id = ?
    `, [purchaseId]);

    return { header: header[0], items };
  }
};

module.exports = PurchaseService;
