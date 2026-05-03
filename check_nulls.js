const db = require('./database/db');

async function checkNulls() {
    try {
        const [customers] = await db.execute("SELECT id, name, debt FROM customers WHERE debt IS NULL");
        console.log("Customers with NULL debt:", customers);

        const [sales] = await db.execute("SELECT id, pending_amount FROM sales_header WHERE pending_amount IS NULL");
        console.log("Sales with NULL pending_amount:", sales);

        if (customers.length > 0) {
            console.log("Fixing customers...");
            await db.execute("UPDATE customers SET debt = 0 WHERE debt IS NULL");
        }
        if (sales.length > 0) {
            console.log("Fixing sales...");
            await db.execute("UPDATE sales_header SET pending_amount = 0 WHERE pending_amount IS NULL");
        }
        console.log("Done.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkNulls();
