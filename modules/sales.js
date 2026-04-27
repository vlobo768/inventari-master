const SaleService = require('../services/saleService');

/**
 * VENTAS - MÓDULO DE COMUNICACIÓN IPC
 */

async function addSale(saleData) {
  try {
    const result = await SaleService.createSale(saleData);
    return { success: true, msg: "Venta registrada correctamente", saleId: result.saleId };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function getAllSales(filters = {}) {
  try {
    const sales = await SaleService.getAllSales(filters);
    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getDailySales() {
  try {
    const sales = await SaleService.getDailySales();
    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getSalesByDateRange(startDate, endDate) {
  try {
    const sales = await SaleService.getSalesByDateRange(startDate, endDate);
    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getSaleDetails(saleId) {
  try {
    const details = await SaleService.getSaleDetails(saleId);
    return { success: true, data: details };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateSale(data) {
  // Actualmente no soportamos editar ítems de venta (integridad de stock)
  // Solo se puede cambiar método de pago o cliente
  try {
    const db = require('../database/db');
    const { id, paymentMethod, customerId } = data;
    if (!id) return { success: false, msg: "ID de venta requerido." };

    const updates = [];
    const params = [];
    if (paymentMethod) { updates.push("payment_method = ?"); params.push(paymentMethod); }
    if (customerId !== undefined) { updates.push("customer_id = ?"); params.push(customerId || null); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios a aplicar." };

    params.push(id);
    await db.execute(`UPDATE sales_header SET ${updates.join(", ")} WHERE id = ?`, params);
    return { success: true, msg: "Venta actualizada correctamente." };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function deleteSale(saleId) {
  try {
    await SaleService.deleteSale(saleId);
    return { success: true, msg: "Venta anulada correctamente. Stock restaurado." };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function getAnalytics(period = 'daily') {
  try {
    const data = await SaleService.getSalesAnalytics(period);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function searchProduct(title) {
  const ProductService = require('../services/productService');
  try {
    const products = await ProductService.getAllProducts({ search: title });
    return products;
  } catch (error) {
    return [];
  }
}

module.exports = {
  addSale,
  getAllSales,
  getDailySales,
  getSalesByDateRange,
  getSaleDetails,
  updateSale,
  deleteSale,
  getAnalytics,
  searchProduct
};
