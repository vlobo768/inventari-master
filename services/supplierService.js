const db = require('../database/db');

/**
 * Profesional Supplier Service
 */
const SupplierService = {
  async getSupplierById(id) {
    const [rows] = await db.execute("SELECT * FROM suppliers WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async getAllSuppliers(filters = {}) {
    const { search } = filters;
    let sql = `SELECT * FROM suppliers WHERE status = 1`;
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR contact_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async addSupplier(data) {
    const { name, contact_name, phone, cedula, address } = data;
    if (!name) throw new Error("El nombre del proveedor es obligatorio.");

    const CoreService = require('./core');
    const result = await CoreService.agregar('suppliers', {
      name,
      contact_name: contact_name || null,
      phone: phone || null,
      cedula: cedula || null,
      address: address || null,
      status: 1
    });
    return { success: true, id: result.insertId };
  },

  async updateSupplier(id, data) {
    const { name, contact_name, phone, cedula, address } = data;
    if (!id) throw new Error("ID de proveedor requerido.");

    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (contact_name !== undefined) { updates.push("contact_name = ?"); params.push(contact_name); }
    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
    if (cedula !== undefined) { updates.push("cedula = ?"); params.push(cedula); }
    if (address !== undefined) { updates.push("address = ?"); params.push(address); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios." };

    const sql = `UPDATE suppliers SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  async deleteSupplier(id) {
    if (!id) throw new Error("ID de proveedor requerido.");
    const [result] = await db.execute("UPDATE suppliers SET status = 0 WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  },

  async getPurchaseHistory(supplierId) {
    // 1. Obtener compras a crédito (y otras) con saldo
    const [sales] = await db.execute(`
      SELECT p.id, p.date, p.total, p.pending_amount, p.payment_method,
             GROUP_CONCAT(pr.name || ' (x' || i.qty || ')') as products
      FROM purchases p
      JOIN purchase_items i ON p.id = i.purchase_id
      JOIN products pr ON i.product_id = pr.id
      WHERE p.supplier_id = ?
      GROUP BY p.id
      ORDER BY p.date DESC
    `, [supplierId]);

    // 2. Obtener historial de pagos al proveedor
    const [payments] = await db.execute(`
      SELECT * FROM supplier_payments 
      WHERE supplier_id = ? 
      ORDER BY date DESC
    `, [supplierId]);

    return { success: true, sales, payments };
  },

  async addPayment(supplierId, amount, note = '', purchaseId = null) {
    if (!supplierId || !amount || amount <= 0) throw new Error("Datos de pago inválidos.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Registrar el pago
      await connection.execute(
        "INSERT INTO supplier_payments (supplier_id, amount, note) VALUES (?, ?, ?)",
        [supplierId, amount, note]
      );

      // 2. Actualizar deuda global con el proveedor
      await connection.execute(
        "UPDATE suppliers SET debt = debt - ? WHERE id = ?",
        [amount, supplierId]
      );

      let remainingPayment = parseFloat(amount);

      // 3. Si hay una compra específica, aplicar primero a esa
      if (purchaseId) {
        const [purchaseRows] = await connection.execute(
          "SELECT pending_amount FROM purchases WHERE id = ? AND supplier_id = ?",
          [purchaseId, supplierId]
        );
        if (purchaseRows.length > 0) {
          const pending = parseFloat(purchaseRows[0].pending_amount);
          const paymentToApply = Math.min(remainingPayment, pending);
          
          await connection.execute(
            "UPDATE purchases SET pending_amount = pending_amount - ? WHERE id = ?",
            [paymentToApply, purchaseId]
          );
          remainingPayment -= paymentToApply;
        }
      }

      // 4. Aplicar el restante a otras compras pendientes (FIFO)
      if (remainingPayment > 0) {
        const [pendingPurchases] = await connection.execute(
          "SELECT id, pending_amount FROM purchases WHERE supplier_id = ? AND payment_method = 'Crédito' AND pending_amount > 0 ORDER BY date ASC",
          [supplierId]
        );

        for (const purchase of pendingPurchases) {
          if (remainingPayment <= 0) break;

          const pending = parseFloat(purchase.pending_amount);
          const paymentToApply = Math.min(remainingPayment, pending);

          await connection.execute(
            "UPDATE purchases SET pending_amount = pending_amount - ? WHERE id = ?",
            [paymentToApply, purchase.id]
          );

          remainingPayment -= paymentToApply;
        }
      }

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

module.exports = SupplierService;
