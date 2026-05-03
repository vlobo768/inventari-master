const CustomerService = require('../services/customerService');

/**
 * CLIENTES - MÓDULO DE COMUNICACIÓN IPC
 */

async function getCustomerById(id) {
  try {
    const customer = await CustomerService.getCustomerById(id);
    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAllCustomers(filters = {}) {
  try {
    const customers = await CustomerService.getAllCustomers(filters);
    return { success: true, data: customers };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addCustomer(data) {
  try {
    const result = await CustomerService.addCustomer(data);
    return { success: true, message: "Cliente agregado", data: { id: result.id } };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function updateCustomer(data) {
  try {
    const { id, ...updateData } = data;
    await CustomerService.updateCustomer(id, updateData);
    return { success: true, message: "Cliente actualizado correctamente" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function deleteCustomer(id) {
  try {
    await CustomerService.deleteCustomer(id);
    return { success: true, message: "Cliente eliminado correctamente" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function getCreditHistory(customerId) {
  try {
    return await CustomerService.getCreditHistory(customerId);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addPayment(customerId, amount, note, saleId) {
  try {
    return await CustomerService.addPayment(customerId, amount, note, saleId);
  } catch (error) {
    return { success: false, error: error.message };
  }
}


module.exports = {
  getCustomerById,
  getAllCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  getCreditHistory,
  addPayment
};
