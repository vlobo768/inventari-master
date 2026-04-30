const db = require('../database/db');

/**
 * Profesional Product Service
 */
const ProductService = {
  /**
   * Obtener un producto por ID
   */
  async getProductById(id) {
    const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [id]);
    return rows[0] || null;
  },

  /**
   * Listar todos los productos con JOINs
   */
  async getAllProducts(filters = {}) {
    const { search, category, stockStatus } = filters;
    let sql = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.barcode,
        p.quantity,
        p.buy_price,
        p.sale_price,
        p.min_stock,
        p.date,
        p.media_id,
        p.is_weighable,
        c.name AS category_name,
        m.file_name AS image
      FROM products p
      LEFT JOIN categories c ON p.categorie_id = c.id
      LEFT JOIN media m ON p.media_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += " AND p.categorie_id = ?";
      params.push(category);
    }

    if (stockStatus === 'low') {
      sql += " AND p.quantity <= p.min_stock";
    }

    sql += " ORDER BY p.id DESC";

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  /**
   * Crear producto profesional
   */
  async addProduct(data) {
    const { name, category, quantity, buyPrice, salePrice, sku, barcode, minStock, mediaId, isWeighable } = data;
    
    if (!name || !category) throw new Error("Nombre y categoría son obligatorios.");

    // Validar duplicados de SKU o Barcode
    if (sku) {
      const [skuCheck] = await db.execute("SELECT id FROM products WHERE sku = ?", [sku]);
      if (skuCheck.length > 0) throw new Error(`El SKU '${sku}' ya existe en el inventario.`);
    }
    if (barcode) {
      const [bcCheck] = await db.execute("SELECT id FROM products WHERE barcode = ?", [barcode]);
      if (bcCheck.length > 0) throw new Error(`El código de barras '${barcode}' ya existe.`);
    }

    const photo = (!mediaId || mediaId === "") ? 0 : mediaId;
    const date = new Date().toISOString().split('T')[0];

    const CoreService = require('./core');
    const result = await CoreService.agregar('products', {
      name, 
      quantity: quantity || 0, 
      buy_price: buyPrice || 0, 
      sale_price: salePrice || 0, 
      categorie_id: category, 
      media_id: photo, 
      date, 
      sku: sku || null, 
      barcode: barcode || null, 
      min_stock: minStock || 0,
      is_weighable: isWeighable ? 1 : 0
    });

    // Registrar movimiento inicial en Kardex
    await this.recordMovement(result.insertId, 'IN', quantity || 0, 'Carga inicial');

    return { success: true, id: result.insertId };
  },

  /**
   * Actualizar producto profesional
   */
  async updateProduct(id, data) {
    const { name, category, quantity, buyPrice, salePrice, sku, barcode, minStock, mediaId, isWeighable } = data;
    
    if (!id) throw new Error("ID de producto requerido.");

    // Validar duplicados evitando el propio registro
    if (sku) {
      const [skuCheck] = await db.execute("SELECT id FROM products WHERE sku = ? AND id != ?", [sku, id]);
      if (skuCheck.length > 0) throw new Error(`El SKU '${sku}' ya está asignado a otro producto.`);
    }
    if (barcode) {
      const [bcCheck] = await db.execute("SELECT id FROM products WHERE barcode = ? AND id != ?", [barcode, id]);
      if (bcCheck.length > 0) throw new Error(`El código de barras '${barcode}' ya está asignado a otro producto.`);
    }

    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (category) { updates.push("categorie_id = ?"); params.push(category); }
    if (quantity !== undefined) { updates.push("quantity = ?"); params.push(quantity); }
    if (buyPrice !== undefined) { updates.push("buy_price = ?"); params.push(buyPrice); }
    if (salePrice !== undefined) { updates.push("sale_price = ?"); params.push(salePrice); }
    if (sku !== undefined) { updates.push("sku = ?"); params.push(sku); }
    if (barcode !== undefined) { updates.push("barcode = ?"); params.push(barcode); }
    if (minStock !== undefined) { updates.push("min_stock = ?"); params.push(minStock); }
    if (mediaId !== undefined) { updates.push("media_id = ?"); params.push(mediaId || 0); }
    if (isWeighable !== undefined) { updates.push("is_weighable = ?"); params.push(isWeighable ? 1 : 0); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios." };

    const sql = `UPDATE products SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Eliminar producto
   */
  async deleteProduct(id) {
    if (!id) throw new Error("ID de producto requerido.");
    const [result] = await db.execute("DELETE FROM products WHERE id = ?", [id]);
    return { success: true, affectedRows: result.affectedRows };
  },

  /**
   * Registrar movimiento de inventario (Kardex)
   */
  async recordMovement(productId, type, qty, reference, userId = null) {
    const sql = `INSERT INTO inventory_movements (product_id, type, qty, reference, user_id) VALUES (?, ?, ?, ?, ?)`;
    await db.execute(sql, [productId, type, qty, reference, userId]);
  },

  /**
   * Obtener historial de movimientos de un producto
   */
  async getProductMovements(productId) {
    const [rows] = await db.execute(`
      SELECT m.*, u.username as user_name
      FROM inventory_movements m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.product_id = ?
      ORDER BY m.date DESC
    `, [productId]);
    return rows;
  }
};

module.exports = ProductService;
