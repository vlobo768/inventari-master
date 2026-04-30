const SettingService = require('../services/settingService');

async function getSetting(key) {
  try {
    const value = await SettingService.getSetting(key);
    return { success: true, data: value };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAllSettings() {
  try {
    const settings = await SettingService.getAllSettings();
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateSetting(data) {
  try {
    const { key, value } = data;
    await SettingService.updateSetting(key, value);
    return { success: true, msg: "Configuración actualizada" };
  } catch (error) {
    return { success: false, msg: error.message };
  }
}

module.exports = {
  getSetting,
  getAllSettings,
  updateSetting
};
