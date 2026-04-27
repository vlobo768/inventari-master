const db = require('../database/db');

/**
 * Profesional Customer Service
 */
const CustomerService = {
  async getAllCustomers(filters = {}) {
    const { search } = filters;
    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async addCustomer(data) {
    const { name, phone, email, address, credit_limit } = data;
    if (!name) throw new Error("El nombre es obligatorio.");

    const [result] = await db.execute(
      "INSERT INTO customers (name, phone, email, address, credit_limit) VALUES (?, ?, ?, ?, ?)",
      [name, phone || null, email || null, address || null, credit_limit || 0]
    );
    return { success: true, id: result.insertId };
  },

  async updateCustomer(id, data) {
    const { name, phone, email, address, credit_limit } = data;
    if (!id) throw new Error("ID de cliente requerido.");

    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
    if (email !== undefined) { updates.push("email = ?"); params.push(email); }
    if (address !== undefined) { updates.push("address = ?"); params.push(address); }
    if (credit_limit !== undefined) { updates.push("credit_limit = ?"); params.push(credit_limit); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios." };

    const sql = `UPDATE customers SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  async deleteCustomer(id) {
    if (!id) throw new Error("ID de cliente requerido.");
    const [result] = await db.execute("DELETE FROM customers WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  }
};

module.exports = CustomerService;
