const db = require('../database/db');

/**
 * Groups/Categories Module
 * Handles a simple wrapper for CategoryService since group logic 
 * is integrated into categories.
 */
const GroupsModule = {
  async getAllGroups() {
    const [rows] = await db.execute("SELECT * FROM categories WHERE parent_id IS NULL");
    return { success: true, data: rows };
  },
  
  async addGroup(data) {
    const { name } = data;
    if (!name) throw new Error("Name is required");
    const [result] = await db.execute("INSERT INTO categories (name) VALUES (?)", [name]);
    return { success: true, id: result.insertId };
  },
  
  async updateGroup(id, data) {
    const { name } = data;
    const [result] = await db.execute("UPDATE categories SET name = ? WHERE id = ?", [name, id]);
    return { success: true, affectedRows: result.affectedRows };
  },
  
  async deleteGroup(id) {
    const [result] = await db.execute("DELETE FROM categories WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  }
};

module.exports = GroupsModule;
