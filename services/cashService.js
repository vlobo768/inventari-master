const db = require('../database/db');

/**
 * Profesional Cash Session Service
 */
const CashService = {
  /**
   * Abrir sesión de caja
   */
  async openSession(userId, startBalance) {
    const [result] = await db.execute(
      "INSERT INTO cash_sessions (user_id, start_balance) VALUES (?, ?)",
      [userId, startBalance || 0]
    );
    return { success: true, sessionId: result.insertId };
  },

  /**
   * Cerrar sesión de caja
   */
  async closeSession(sessionId, endBalance) {
    const [result] = await db.execute(
      "UPDATE cash_sessions SET end_date = NOW(), end_balance = ? WHERE id = ?",
      [endBalance, sessionId]
    );
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Obtener sesión activa
   */
  async getActiveSession() {
    const [rows] = await db.execute(
      "SELECT * FROM cash_sessions WHERE end_date IS NULL LIMIT 1"
    );
    return rows[0] || null;
  },

  /**
   * Historial de arqueos
   */
  async getSessionHistory() {
    const [rows] = await db.execute(`
      SELECT s.*, u.username 
      FROM cash_sessions s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.start_date DESC
    `);
    return rows;
  }
};

module.exports = CashService;
