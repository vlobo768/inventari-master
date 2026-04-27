const db = require('../database/db');

/**
 * Profesional Category Service
 */
const CategoryService = {
  /**
   * Obtener una categoría por ID
   */
  async getCategoryById(id) {
    const [rows] = await db.execute("SELECT * FROM categories WHERE id = ?", [id]);
    return rows[0] || null;
  },

  /**
   * Obtener todas las categorías con jerarquía
   */
  async getAllCategories() {
    const [rows] = await db.execute(`
      SELECT 
        c.id, 
        c.name, 
        c.parent_id,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY p.name ASC, c.name ASC
    `);
    return rows;
  },

  /**
   * Crear categoría (incluyendo subcategoría)
   */
  async addCategory(data) {
    const { name, parent_id } = data;
    if (!name) throw new Error("El nombre es obligatorio.");

    const [result] = await db.execute(
      "INSERT INTO categories (name, parent_id) VALUES (?, ?)",
      [name, parent_id || null]
    );
    return { success: true, id: result.insertId };
  },

  /**
   * Actualizar categoría
   */
  async updateCategory(id, data) {
    const { name, parent_id } = data;
    if (!id) throw new Error("ID de categoría requerido.");

    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (parent_id !== undefined) { updates.push("parent_id = ?"); params.push(parent_id); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios." };

    const sql = `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Eliminar categoría
   */
  async deleteCategory(id) {
    if (!id) throw new Error("ID de categoría requerido.");
    
    // Verificar si tiene subcategorías o productos
    const [subs] = await db.execute("SELECT id FROM categories WHERE parent_id = ?", [id]);
    if (subs.length > 0) throw new Error("No se puede eliminar una categoría que tiene subcategorías.");

    const [prods] = await db.execute("SELECT id FROM products WHERE categorie_id = ?", [id]);
    if (prods.length > 0) throw new Error("No se puede eliminar una categoría que tiene productos asociados.");

    const [result] = await db.execute("DELETE FROM categories WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  }
};

module.exports = CategoryService;
