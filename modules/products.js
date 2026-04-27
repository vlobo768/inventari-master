const ProductService = require('../services/productService');

/**
 * PRODUCTOS - MÓDULO DE COMUNICACIÓN IPC
 */

async function getProductById(id) {
  try {
    const product = await ProductService.getProductById(id);
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAllProducts(filters = {}) {
  try {
    const products = await ProductService.getAllProducts(filters);
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addProduct(data) {
  try {
    await ProductService.addProduct(data);
    return { success: true, msg: "Producto añadido correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function updateProduct(data) {
  try {
    const { id, ...updateData } = data;
    await ProductService.updateProduct(id, updateData);
    return { success: true, msg: "Producto actualizado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function deleteProduct(id) {
  try {
    await ProductService.deleteProduct(id);
    return { success: true, msg: "Producto eliminado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function searchProductByName(name) {
  try {
    const products = await ProductService.getAllProducts({ search: name });
    return products;
  } catch (error) {
    return [];
  }
}

async function findProductForSale(name) {
  try {
    const products = await ProductService.getAllProducts({ search: name });
    if (products.length === 0) return [];
    
    // Retornamos el primero como el sistema actual
    const p = products[0];
    return [{
      id: p.id,
      name: p.name,
      price: p.sale_price,
      quantity: 1,
      total: p.sale_price,
      date: new Date().toISOString().split('T')[0]
    }];
  } catch (error) {
    return [];
  }
}

async function getProductKardex(productId) {
  try {
    const movements = await ProductService.getProductMovements(productId);
    return { success: true, data: movements };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  getProductById,
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  searchProductByName,
  findProductForSale,
  getProductKardex
};
