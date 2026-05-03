const db = require('../database/db');

/**
 * Profesional Cash Session Service
 */
const CashService = {
  /**
   * Abrir sesión de caja
   */
  async openSession(userId, startBalance) {
    const CoreService = require('./core');
    const result = await CoreService.agregar('cash_sessions', {
      user_id: userId,
      start_balance: startBalance || 0
    });
    return { success: true, sessionId: result.insertId };
  },

  /**
   * Cerrar sesión de caja
   */
  async closeSession(sessionId, endBalance) {
    const [result] = await db.execute(
      "UPDATE cash_sessions SET end_date = CURRENT_TIMESTAMP, end_balance = ? WHERE id = ?",
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
    if (!rows[0]) return null;

    const session = rows[0];
    
    // 1. Ventas creadas durante esta sesión (solo las activas)
    const [salesRows] = await db.execute(`
      SELECT 
        SUM(CASE WHEN payment_method = 'Efectivo' THEN total ELSE 0 END) as cash_sales,
        SUM(CASE WHEN payment_method = 'Tarjeta' THEN total ELSE 0 END) as card_sales,
        SUM(CASE WHEN payment_method = 'Transferencia' THEN total ELSE 0 END) as transfer_sales,
        SUM(CASE WHEN payment_method = 'Crédito' THEN total ELSE 0 END) as credit_sales
      FROM sales_header 
      WHERE date >= ? AND status != 'cancelled'
    `, [session.start_date]);

    // 2. Ventas ANULADAS durante esta sesión (Monto total para visualización)
    const [cancelledRows] = await db.execute(`
      SELECT SUM(total) as total_cancelled FROM sales_header 
      WHERE status = 'cancelled' AND cancelled_at >= ?
    `, [session.start_date]);

    // 3. Efectivo devuelto por ventas de TURNOS ANTERIORES (afecta el físico esperado)
    const [refundedRows] = await db.execute(`
      SELECT SUM(total) as cash_refunded FROM sales_header 
      WHERE status = 'cancelled' AND cancelled_at >= ? AND date < ? AND payment_method = 'Efectivo'
    `, [session.start_date, session.start_date]);

    session.cash_sales = salesRows[0].cash_sales || 0;
    session.card_sales = salesRows[0].card_sales || 0;
    session.transfer_sales = salesRows[0].transfer_sales || 0;
    session.credit_sales = salesRows[0].credit_sales || 0;
    session.cancelled_sales = cancelledRows[0].total_cancelled || 0;
    
    // El saldo esperado es: Inicial + Ingresos Efectivo de Hoy - Devoluciones de Efectivo de días anteriores
    const cashRefunded = refundedRows[0].cash_refunded || 0;
    session.expected_balance = parseFloat(session.start_balance) + parseFloat(session.cash_sales) - parseFloat(cashRefunded);

    return session;
  },

  /**
   * Historial de arqueos
   */
  async getSessionHistory() {
    const [rows] = await db.execute(`
      SELECT 
        s.*, 
        u.username,
        COALESCE((SELECT SUM(total) FROM sales_header WHERE date >= s.start_date AND (s.end_date IS NULL OR date <= s.end_date) AND payment_method = 'Efectivo' AND status != 'cancelled'), 0) as cash_sales,
        COALESCE((SELECT SUM(total) FROM sales_header WHERE date >= s.start_date AND (s.end_date IS NULL OR date <= s.end_date) AND payment_method = 'Tarjeta' AND status != 'cancelled'), 0) as card_sales,
        COALESCE((SELECT SUM(total) FROM sales_header WHERE date >= s.start_date AND (s.end_date IS NULL OR date <= s.end_date) AND payment_method = 'Transferencia' AND status != 'cancelled'), 0) as transfer_sales,
        COALESCE((SELECT SUM(total) FROM sales_header WHERE date >= s.start_date AND (s.end_date IS NULL OR date <= s.end_date) AND payment_method = 'Crédito' AND status != 'cancelled'), 0) as credit_sales,
        COALESCE((SELECT SUM(total) FROM sales_header WHERE status = 'cancelled' AND cancelled_at >= s.start_date AND (s.end_date IS NULL OR cancelled_at <= s.end_date)), 0) as cancelled_sales,
        COALESCE((SELECT SUM(total) FROM sales_header WHERE status = 'cancelled' AND cancelled_at >= s.start_date AND (s.end_date IS NULL OR cancelled_at <= s.end_date) AND date < s.start_date AND payment_method = 'Efectivo'), 0) as cash_refunded
      FROM cash_sessions s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.start_date DESC
    `);

    // Calcular el saldo esperado y descuadre (difference) para cada sesión histórica
    rows.forEach(row => {
      row.expected_balance = parseFloat(row.start_balance) + parseFloat(row.cash_sales) - parseFloat(row.cash_refunded || 0);
      row.discrepancy = row.end_balance !== null 
        ? parseFloat(row.end_balance) - row.expected_balance 
        : null;
    });

    return rows;
  },

  /**
   * Eliminar una sesión específica por ID
   */
  async deleteSession(sessionId) {
    const [result] = await db.execute(
      "DELETE FROM cash_sessions WHERE id = ? AND end_date IS NOT NULL",
      [sessionId]
    );
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Eliminar la última sesión cerrada (La primera en la lista)
   */
  async deleteFirstClosedSession() {
    const [result] = await db.execute(`
      DELETE FROM cash_sessions 
      WHERE id = (SELECT id FROM cash_sessions WHERE end_date IS NOT NULL ORDER BY start_date DESC LIMIT 1)
    `);
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Limpiar historial (Eliminar solo sesiones cerradas)
   */
  async clearSessionHistory() {
    const [result] = await db.execute(
      "DELETE FROM cash_sessions WHERE end_date IS NOT NULL"
    );
    return { success: true, affectedRows: result.affectedRows };
  }
};

module.exports = CashService;
