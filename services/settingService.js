const db = require('../database/db');

const SettingService = {
  async getSetting(key) {
    const [rows] = await db.execute("SELECT setting_value FROM settings WHERE setting_key = ?", [key]);
    return rows.length > 0 ? rows[0].setting_value : null;
  },

  async getAllSettings() {
    const [rows] = await db.execute("SELECT setting_key, setting_value, description FROM settings");
    const settings = {};
    rows.forEach(r => settings[r.setting_key] = r.setting_value);
    return settings;
  },

  async updateSetting(key, value) {
    const [result] = await db.execute(
      "UPDATE settings SET setting_value = ? WHERE setting_key = ?",
      [value, key]
    );
    return { success: true, affectedRows: result.affectedRows };
  },
  
  async getBcvRate() {
    const rate = await this.getSetting('bcv_rate');
    return rate ? parseFloat(rate) : 1.00;
  }
};

module.exports = SettingService;
