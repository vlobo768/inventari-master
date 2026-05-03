const db = require('./database/db');

async function resetDebt() {
    try {
        const [result] = await db.execute("UPDATE customers SET debt = 0 WHERE name = 'tesorito'");
        console.log(`Updated ${result.affectedRows} customer(s).`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

resetDebt();
