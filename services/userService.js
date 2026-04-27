const db = require('../database/db');
const crypto = require('crypto');

/**
 * Profesional User Service
 */
const UserService = {
  /**
   * Autenticar usuario profesional
   */
  async authenticate(username, password) {
    try {
      console.log(`Intentando autenticar usuario: ${username}`);
      
      if (!username || !password) {
        console.warn("Credenciales vacías proporcionadas");
        return false;
      }

      const sql = `SELECT * FROM users WHERE username = ? LIMIT 1`;
      const [rows] = await db.execute(sql, [username]);

      if (rows.length === 0) {
        console.warn(`Usuario no encontrado: ${username}`);
        return false;
      }

      const user = rows[0];
      
      // Verificación de estado del usuario
      if (user.status === 0) {
        console.warn(`Usuario ${username} está desactivado`);
        return { error: "User deactivated" };
      }

      const hash = crypto.createHash('sha1').update(password).digest('hex');

      if (hash === user.password) {
        console.log(`Autenticación exitosa para: ${username}`);
        return user;
      } else {
        console.warn(`Contraseña incorrecta para: ${username}`);
        return false;
      }
    } catch (error) {
      console.error("Error crítico en authenticate:", error);
      throw error;
    }
  },

  /**
   * Obtener todos los usuarios con filtros y búsqueda
   */
  async getAllUsers(filters = {}) {
    const { search, role, status } = filters;
    let sql = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.phone,
        u.email,
        u.status,
        u.last_login,
        u.created_at,
        g.group_name as role,
        g.group_level as level
      FROM users u
      LEFT JOIN user_groups g ON u.user_level = g.group_level
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += " AND (u.name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      sql += " AND g.group_level = ?";
      params.push(role);
    }

    if (status !== undefined) {
      sql += " AND u.status = ?";
      params.push(status);
    }

    sql += " ORDER BY u.id DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  /**
   * Obtener usuario por ID
   */
  async getUserById(id) {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0] || null;
  },

  /**
   * Crear usuario profesional
   */
  async createUser(data) {
    const { name, username, password, level, phone, email } = data;

    if (!name || !username || !password || !level) {
      throw new Error("Campos obligatorios faltantes: nombre, usuario, contraseña y rol.");
    }

    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    
    const sql = `
      INSERT INTO users (name, username, password, user_level, status, phone, email)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `;

    const [result] = await db.execute(sql, [name, username, hashedPassword, level, phone || null, email || null]);
    return { success: true, id: result.insertId };
  },

  /**
   * Actualizar usuario profesional
   */
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

  /**
   * Eliminar usuario
   */
  async deleteUser(id) {
    if (!id) throw new Error("ID de usuario requerido.");
    const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Activar/Desactivar usuario
   */
  async toggleUserStatus(id, status) {
    return this.updateUser(id, { status });
  },

  /**
   * Cambiar contraseña profesional
   */
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

  /**
   * Actualizar último inicio de sesión
   */
  async updateLastLogin(id) {
    await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [id]);
    return true;
  },

  /**
   * Obtener roles disponibles
   */
  async getRoles() {
    const [rows] = await db.execute("SELECT * FROM user_groups");
    return rows;
  }
};

module.exports = UserService;
