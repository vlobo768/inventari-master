const db = require('../database/db');
const fs = require('fs');
const path = require('path');

// carpetas de imágenes
const PRODUCTS_MEDIA_PATH = path.join(__dirname, "../uploads/products/");
const USERS_MEDIA_PATH = path.join(__dirname, "../uploads/users/");

/**
 * Media Module - Professional Edition
 */
const MediaModule = {
  /**
   * Listar toda la media de productos
   */
  async getAllMedia() {
    try {
      const [rows] = await db.execute("SELECT * FROM media");
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Subir imagen de producto
   */
  async uploadProductMedia(filePath, fileName) {
    try {
      // Asegurar que la carpeta existe
      if (!fs.existsSync(PRODUCTS_MEDIA_PATH)) {
        fs.mkdirSync(PRODUCTS_MEDIA_PATH, { recursive: true });
      }

      const dest = path.join(PRODUCTS_MEDIA_PATH, fileName);
      fs.copyFileSync(filePath, dest);

      const [result] = await db.execute(
        "INSERT INTO media (file_name, file_type) VALUES (?, ?)",
        [fileName, path.extname(fileName)]
      );

      return { success: true, id: result.insertId, msg: "Imagen subida correctamente" };
    } catch (err) {
      return { success: false, msg: "Error al subir imagen: " + err.message };
    }
  },

  /**
   * Eliminar imagen
   */
  async deleteMedia(id, fileName) {
    try {
      if (!id || !fileName) throw new Error("Datos inválidos");

      const filePath = path.join(PRODUCTS_MEDIA_PATH, fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const [result] = await db.execute("DELETE FROM media WHERE id = ?", [id]);
      
      return { success: true, affectedRows: result.affectedRows, msg: "Imagen eliminada correctamente" };
    } catch (err) {
      return { success: false, msg: "Error al eliminar imagen: " + err.message };
    }
  }
};

module.exports = MediaModule;
