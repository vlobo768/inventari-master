const UserService = require('../services/userService');

/**
 * USUARIOS - MÓDULO DE COMUNICACIÓN IPC
 */

async function findAllGroups() {
  try {
    const groups = await UserService.getRoles();
    return { success: true, data: groups };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAllUsers(filters = {}) {
  try {
    const users = await UserService.getAllUsers(filters);
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function addUser(data) {
  try {
    const result = await UserService.createUser(data);
    return { success: true, msg: "Usuario creado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function updateUser(data) {
  try {
    const { id, ...updateData } = data;
    const result = await UserService.updateUser(id, updateData);
    return { success: true, msg: "Usuario actualizado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function deleteUser(id) {
  try {
    const result = await UserService.deleteUser(id);
    return { success: true, msg: "Usuario eliminado correctamente" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function getUserProfile(userId) {
  try {
    const user = await UserService.getUserById(userId);
    return user || null;
  } catch (error) {
    return null;
  }
}

async function changePassword(data) {
  try {
    const { id, oldPassword, newPassword } = data;
    await UserService.changePassword(id, oldPassword, newPassword);
    return { success: true, logout: true, msg: "Contraseña actualizada. Inicia sesión nuevamente." };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

async function toggleUserStatus(id, status) {
  try {
    await UserService.toggleUserStatus(id, status);
    return { success: true, msg: "Estado de usuario actualizado" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

module.exports = {
  findAllGroups,
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  getUserProfile,
  changePassword,
  toggleUserStatus
};
