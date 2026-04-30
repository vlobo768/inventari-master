const PurchaseService = require('../services/purchaseService');

/**
 * COMPRAS - MÓDULO DE COMUNICACIÓN IPC
 */

async function createPurchase(data) {
  try {
    const result = await PurchaseService.createPurchase(data);
    return { success: true, msg: "Compra registrada y stock actualizado", purchaseId: result.purchaseId };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function getAllPurchases(filters = {}) {
  try {
    const purchases = await PurchaseService.getAllPurchases(filters);
    return { success: true, data: purchases };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getPurchaseDetails(purchaseId) {
  try {
    const details = await PurchaseService.getPurchaseDetails(purchaseId);
    return { success: true, data: details };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updatePurchase(data) {
  try {
    const { id, ...updateData } = data;
    await PurchaseService.updatePurchase(id, updateData);
    return { success: true, msg: "Compra actualizada correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function deletePurchase(id) {
  try {
    await PurchaseService.deletePurchase(id);
    return { success: true, msg: "Compra eliminada y stock revertido" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseDetails,
  updatePurchase,
  deletePurchase
};
