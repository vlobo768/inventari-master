const CashService = require('../services/cashService');

/**
 * CAJA - MÓDULO DE COMUNICACIÓN IPC
 */

async function openSession(userId, startBalance) {
  try {
    const result = await CashService.openSession(userId, startBalance);
    return { success: true, sessionId: result.sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function closeSession(sessionId, endBalance) {
  try {
    const result = await CashService.closeSession(sessionId, endBalance);
    return { success: true, msg: "Sesión de caja cerrada correctamente" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getActiveSession() {
  try {
    const session = await CashService.getActiveSession();
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getSessionHistory() {
  try {
    const history = await CashService.getSessionHistory();
    return { success: true, data: history };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  openSession,
  closeSession,
  getActiveSession,
  getSessionHistory
};
