const db = require('../database/db');

/**
 * CORE SERVICE - Professional Edition
 * This service provides generic database operations.
 * Now fully migrated to MySQL and async/await.
 */

const CoreService = {
  /**
   * Find all records from a table
   */
  async findAll(table) {
    const [rows] = await db.execute(`SELECT * FROM ${table}`);
    return rows;
  },

  /**
   * Generic Add (Insert) function
   * @param {string} table - The table name
   * @param {object} data - Object containing column: value pairs
   * @param {object} [connection] - Optional db connection for transactions
   */
  async agregar(table, data, connection = null) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const columns = keys.join(', ');

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    
    let result;
    if (connection) {
      [result] = await connection.execute(sql, values);
    } else {
      [result] = await db.execute(sql, values);
    }
    
    return { success: true, insertId: result.insertId };
  },

  /**
   * Find a single record by ID
   */
  async findById(table, id) {
    const [rows] = await db.execute(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  },

  /**
   * Delete a record by ID
   */
  async deleteById(table, id) {
    const [result] = await db.execute(`DELETE FROM ${table} WHERE id = ? LIMIT 1`, [id]);
    return result.affectedRows === 1;
  },

  /**
   * Count records in a table
   */
  async count(table) {
    const [rows] = await db.execute(`SELECT COUNT(id) AS total FROM ${table}`);
    return rows[0].total;
  },

  /**
   * Check if a table exists in the database (MySQL version)
   */
  async tableExists(table) {
    const [rows] = await db.execute(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", 
      [table]
    );
    return rows.length > 0;
  }
};

module.exports = CoreService;
