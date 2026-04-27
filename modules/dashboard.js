const db = require('../database/db');

/**
 * DASHBOARD - LÓGICA DE KPIs
 */

async function getDashboardData() {
  try {
    const counts = {};
    
    const [userCount] = await db.execute("SELECT COUNT(*) as total FROM users");
    counts.users = userCount[0].total;

    const [prodCount] = await db.execute("SELECT COUNT(*) as total FROM products");
    counts.products = prodCount[0].total;

    const [saleCount] = await db.execute("SELECT COUNT(*) as total FROM sales_header");
    counts.sales = saleCount[0].total;

    const [catCount] = await db.execute("SELECT COUNT(*) as total FROM categories");
    counts.categories = catCount[0].total;

    // KPI: Ventas del día
    const [todaySales] = await db.execute(
      "SELECT SUM(total) as total FROM sales_header WHERE DATE(date) = CURDATE()"
    );
    counts.todayRevenue = todaySales[0].total || 0;

    // KPI: Productos con stock crítico
    const [lowStock] = await db.execute(
      "SELECT COUNT(*) as total FROM products WHERE quantity <= min_stock"
    );
    counts.lowStockProducts = lowStock[0].total;

    return { success: true, data: { counts } };
  } catch (error) {
    console.error("Error en getDashboardData:", error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getDashboardData
};
