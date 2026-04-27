const CustomerService = require('../services/customerService');

/**
 * CLIENTES - MÓDULO DE COMUNICACIÓN IPC
 */

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
    await CustomerService.addCustomer(data);
    return { success: true, msg: "Cliente agregado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function updateCustomer(data) {
  try {
    const { id, ...updateData } = data;
    await CustomerService.updateCustomer(id, updateData);
    return { success: true, msg: "Cliente actualizado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function deleteCustomer(id) {
  try {
    await CustomerService.deleteCustomer(id);
    return { success: true, msg: "Cliente eliminado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

module.exports = {
  getAllCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer
};
