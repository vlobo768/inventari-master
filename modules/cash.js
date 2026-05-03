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

async function deleteSession(id) {
  try {
    const result = await CashService.deleteSession(id);
    return { success: true, msg: "Sesión eliminada correctamente." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteFirstClosedSession() {
  try {
    const result = await CashService.deleteFirstClosedSession();
    return { success: true, msg: "Sesión más reciente eliminada." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function clearSessionHistory() {
  try {
    const result = await CashService.clearSessionHistory();
    return { success: true, msg: `Se eliminaron ${result.affectedRows} registros del historial.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  openSession,
  closeSession,
  getActiveSession,
  getSessionHistory,
  deleteSession,
  deleteFirstClosedSession,
  clearSessionHistory
};
