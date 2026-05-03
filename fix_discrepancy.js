const db = require('./database/db');

async function fixDiscrepancy() {
    try {
        const [gabriel] = await db.execute("SELECT id FROM customers WHERE name LIKE '%gabriel orejas%'");
        if (gabriel.length > 0) {
            const id = gabriel[0].id;
            console.log(`Gabriel ID: ${id}`);
            // Reconectar venta #91 si está huérfana
            const [result] = await db.execute("UPDATE sales_header SET customer_id = ? WHERE id = 91 AND customer_id IS NULL", [id]);
            console.log(`Updated ${result.affectedRows} sale(s).`);
        } else {
            console.log("Gabriel not found.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fixDiscrepancy();
