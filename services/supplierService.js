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
    let sql = `SELECT * FROM suppliers WHERE 1=1`;
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR contact_name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async addSupplier(data) {
    const { name, contact_name, phone, email, address } = data;
    if (!name) throw new Error("El nombre del proveedor es obligatorio.");

    const CoreService = require('./core');
    const result = await CoreService.agregar('suppliers', {
      name,
      contact_name: contact_name || null,
      phone: phone || null,
      email: email || null,
      address: address || null
    });
    return { success: true, id: result.insertId };
  },

  async updateSupplier(id, data) {
    const { name, contact_name, phone, email, address } = data;
    if (!id) throw new Error("ID de proveedor requerido.");

    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (contact_name !== undefined) { updates.push("contact_name = ?"); params.push(contact_name); }
    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
    if (email !== undefined) { updates.push("email = ?"); params.push(email); }
    if (address !== undefined) { updates.push("address = ?"); params.push(address); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios." };

    const sql = `UPDATE suppliers SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  async deleteSupplier(id) {
    if (!id) throw new Error("ID de proveedor requerido.");
    const [result] = await db.execute("DELETE FROM suppliers WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  }
};

module.exports = SupplierService;
