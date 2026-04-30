const db = require('../database/db');
const crypto = require('crypto');

/**
 * Profesional User Service
 */
const UserService = {
  /**
   * Autenticar usuario profesional con manejo robusto de errores
   */
  async authenticate(username, password) {
    try {
      if (!username || !password) return false;

      const sql = `SELECT * FROM users WHERE username = ? LIMIT 1`;
      const [rows] = await db.execute(sql, [username]);

      if (rows.length === 0) return false;

      const user = rows[0];
      
      if (user.status === 0) {
        return { error: "User deactivated" };
      }

      const hash = crypto.createHash('sha1').update(password).digest('hex');

      if (hash === user.password) {
        return user;
      } else {
        return false;
      }
    } catch (error) {
      // Capturar AggregateError o errores de conexión
      console.error("❌ Auth Service Error:", error.message);
      throw new Error("DATABASE_UNAVAILABLE");
    }
  },

  async getAllUsers(filters = {}) {
    const { search, role, status } = filters;
    let sql = `
      SELECT 
        u.id, u.name, u.username, u.phone, u.email, u.status, u.last_login, u.created_at,
        g.group_name as role, g.group_level as level
      FROM users u
      LEFT JOIN user_groups g ON u.user_level = g.group_level
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      sql += " AND (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role && role !== '') {
      sql += " AND g.group_level = ?";
      params.push(role);
    }
    if (status !== undefined && status !== '') {
      sql += " AND u.status = ?";
      params.push(status);
    }
    sql += " ORDER BY u.id DESC";
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async getUserById(id) {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async createUser(data) {
    const { name, username, password, level, phone, email } = data;
    if (!name || !username || !password || !level) {
      throw new Error("Campos obligatorios faltantes: nombre, usuario, contraseña y rol.");
    }
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const CoreService = require('./core');
    const result = await CoreService.agregar('users', {
      name,
      username,
      password: hashedPassword,
      user_level: level,
      status: 1,
      phone: phone || null,
      email: email || null
    });
    return { success: true, id: result.insertId };
  },

  async updateUser(id, data) {
    const { name, username, password, level, status, phone, email } = data;
    if (!id) throw new Error("ID de usuario requerido.");
    let updates = [];
    let params = [];
    if (name) { updates.push("name = ?"); params.push(name); }
    if (username) { updates.push("username = ?"); params.push(username); }
    if (password) { 
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
      updates.push("password = ?"); 
      params.push(hashedPassword); 
    }
    if (level !== undefined) { updates.push("user_level = ?"); params.push(level); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
    if (email !== undefined) { updates.push("email = ?"); params.push(email); }
    if (updates.length === 0) return { success: false, msg: "No hay cambios para actualizar." };
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);
    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  async deleteUser(id) {
    if (!id) throw new Error("ID de usuario requerido.");
    const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  },

  async toggleUserStatus(id, status) {
    return this.updateUser(id, { status });
  },

  async changePassword(id, oldPassword, newPassword) {
    const user = await this.getUserById(id);
    if (!user) throw new Error("Usuario no encontrado.");
    const hashedOld = crypto.createHash('sha1').update(oldPassword).digest('hex');
    if (user.password !== hashedOld) {
      throw new Error("La contraseña actual es incorrecta.");
    }
    const hashedNew = crypto.createHash('sha1').update(newPassword).digest('hex');
    await db.execute("UPDATE users SET password = ? WHERE id = ?", [hashedNew, id]);
    return { success: true };
  },

  async updateLastLogin(id) {
    await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [id]);
    return true;
  },

  async getRoles() {
    const [rows] = await db.execute("SELECT * FROM user_groups");
    return rows;
  }
};

module.exports = UserService;
