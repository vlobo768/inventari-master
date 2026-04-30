const CategoryService = require('../services/categoryService');

/**
 * CATEGORÍAS - MÓDULO DE COMUNICACIÓN IPC
 */

async function getCategoryById(id) {
  try {
    const category = await CategoryService.getCategoryById(id);
    return { success: true, data: category };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAllCategories() {
  try {
    const categories = await CategoryService.getAllCategories();
    return { success: true, data: categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addCategory(data) {
  try {
    await CategoryService.addCategory(data);
    return { success: true, message: "Categoría agregada correctamente" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function updateCategory(data) {
  try {
    const { id, ...updateData } = data;
    await CategoryService.updateCategory(id, updateData);
    return { success: true, message: "Categoría actualizada correctamente" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function deleteCategory(id) {
  try {
    await CategoryService.deleteCategory(id);
    return { success: true, message: "Categoría eliminada" };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  getCategoryById,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory
};
