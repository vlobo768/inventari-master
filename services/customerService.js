const db = require('../database/db');

/**
 * Profesional Customer Service
 */
const CustomerService = {
  async getCustomerById(id) {
    const [rows] = await db.execute("SELECT * FROM customers WHERE id = ?", [id]);
    return rows[0] || null;
  },

  async getAllCustomers(filters = {}) {
    const { search } = filters;
    let sql = `SELECT * FROM customers WHERE 1=1`;
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR phone LIKE ? OR cedula LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async addCustomer(data) {
    const { name, phone, cedula, address, credit_limit } = data;
    if (!name) throw new Error("El nombre es obligatorio.");

    const CoreService = require('./core');
    const result = await CoreService.agregar('customers', {
      name,
      phone: phone || null,
      cedula: cedula || null,
      address: address || null,
      credit_limit: credit_limit || 0
    });
    
    return { success: true, id: result.insertId };
  },

  async updateCustomer(id, data) {
    const { name, phone, cedula, address, credit_limit } = data;
    if (!id) throw new Error("ID de cliente requerido.");

    let updates = [];
    let params = [];

    if (name) { updates.push("name = ?"); params.push(name); }
    if (phone !== undefined) { updates.push("phone = ?"); params.push(phone); }
    if (cedula !== undefined) { updates.push("cedula = ?"); params.push(cedula); }
    if (address !== undefined) { updates.push("address = ?"); params.push(address); }
    if (credit_limit !== undefined) { updates.push("credit_limit = ?"); params.push(credit_limit); }

    if (updates.length === 0) return { success: false, msg: "No hay cambios." };

    const sql = `UPDATE customers SET ${updates.join(", ")} WHERE id = ?`;
    params.push(id);

    const [result] = await db.execute(sql, params);
    return { success: true, affectedRows: result.affectedRows };
  },

  async deleteCustomer(id) {
    if (!id) throw new Error("ID de cliente requerido.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Verificar si tiene deuda mayor a 0
      const [customer] = await connection.execute("SELECT debt FROM customers WHERE id = ?", [id]);
      if (customer.length === 0) throw new Error("Cliente no encontrado.");
      
      if (parseFloat(customer[0].debt || 0) > 0) {
        throw new Error("No se puede eliminar un cliente con deuda pendiente mayor a $0.00.");
      }

      // 2. Desvincular ventas y pagos asociados
      await connection.execute("UPDATE sales_header SET customer_id = NULL WHERE customer_id = ?", [id]);
      await connection.execute("UPDATE customer_payments SET customer_id = NULL WHERE customer_id = ?", [id]);
      
      // 3. Eliminar registro
      const [result] = await connection.execute("DELETE FROM customers WHERE id = ?", [id]);
      
      await connection.commit();
      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getCreditHistory(customerId) {
    // 1. Obtener ventas a crédito pendientes
    const [sales] = await db.execute(`
      SELECT h.id, h.customer_id, h.date, h.total, h.pending_amount, 
             GROUP_CONCAT(p.name || ' (x' || i.qty || ')') as products
      FROM sales_header h
      JOIN sales_items i ON h.id = i.sale_id
      JOIN products p ON i.product_id = p.id
      WHERE h.customer_id = ? AND h.payment_method = 'Crédito' AND h.status != 'cancelled'
      GROUP BY h.id
      ORDER BY h.date DESC
    `, [customerId]);

    // 2. Obtener historial de pagos
    const [payments] = await db.execute(`
      SELECT * FROM customer_payments 
      WHERE customer_id = ? 
      ORDER BY date DESC
    `, [customerId]);

    return { success: true, sales, payments };
  },

  async addPayment(customerId, amount, note = '', saleId = null) {
    if (!customerId || !amount || amount <= 0) throw new Error("Datos de pago inválidos.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Registrar el pago
      await connection.execute(
        "INSERT INTO customer_payments (customer_id, amount, note) VALUES (?, ?, ?)",
        [customerId, amount, note]
      );

      // 2. Actualizar deuda global del cliente (evitando deuda negativa)
      await connection.execute(
        "UPDATE customers SET debt = MAX(0, COALESCE(debt, 0) - ?) WHERE id = ?",
        [amount, customerId]
      );

      let remainingPayment = parseFloat(amount);

      // 3. Si hay una venta específica, aplicar primero a esa
      if (saleId) {
        const [saleRows] = await connection.execute(
          "SELECT pending_amount FROM sales_header WHERE id = ? AND customer_id = ?",
          [saleId, customerId]
        );
        if (saleRows.length > 0) {
          const pending = parseFloat(saleRows[0].pending_amount);
          const paymentToApply = Math.min(remainingPayment, pending);
          
          await connection.execute(
            "UPDATE sales_header SET pending_amount = MAX(0, COALESCE(pending_amount, 0) - ?) WHERE id = ?",
            [paymentToApply, saleId]
          );
          remainingPayment -= paymentToApply;
        }
      }

      // 4. Aplicar el restante a otras ventas pendientes (FIFO)
      if (remainingPayment > 0) {
        const [pendingSales] = await connection.execute(
          "SELECT id, pending_amount FROM sales_header WHERE customer_id = ? AND payment_method = 'Crédito' AND pending_amount > 0 AND status != 'cancelled' AND id != ? ORDER BY date ASC",
          [customerId, saleId || 0]
        );

        for (const sale of pendingSales) {
          if (remainingPayment <= 0) break;

          const pending = parseFloat(sale.pending_amount);
          const paymentToApply = Math.min(remainingPayment, pending);

          await connection.execute(
            "UPDATE sales_header SET pending_amount = MAX(0, COALESCE(pending_amount, 0) - ?) WHERE id = ?",
            [paymentToApply, sale.id]
          );

          remainingPayment -= paymentToApply;
        }
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = CustomerService;
