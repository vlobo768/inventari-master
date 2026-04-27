const SupplierService = require('../services/supplierService');

/**
 * PROVEEDORES - MÓDULO DE COMUNICACIÓN IPC
 */

async function getAllSuppliers(filters = {}) {
  try {
    const suppliers = await SupplierService.getAllSuppliers(filters);
    return { success: true, data: suppliers };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addSupplier(data) {
  try {
    await SupplierService.addSupplier(data);
    return { success: true, msg: "Proveedor agregado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function updateSupplier(data) {
  try {
    const { id, ...updateData } = data;
    await SupplierService.updateSupplier(id, updateData);
    return { success: true, msg: "Proveedor actualizado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function deleteSupplier(id) {
  try {
    await SupplierService.deleteSupplier(id);
    return { success: true, msg: "Proveedor eliminado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

module.exports = {
  getAllSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier
};
