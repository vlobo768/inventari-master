const db = require('./db');

/**
 * SISTEMA DE MIGRACIONES ROBUSTO
 */
async function migrate(retries = 5, delay = 2000) {
    console.log("🚀 Iniciando secuencia de migración de base de datos...");
    
    for (let i = 1; i <= retries; i++) {
        try {
            // Verificar si la DB responde antes de intentar migrar
            const connectionTest = await db.testConnection();
            if (!connectionTest.success) {
                throw new Error(`Conexión fallida: ${connectionTest.error}`);
            }

            await performMigration();
            console.log("✅ Migración completada exitosamente.");
            return { success: true };
        } catch (error) {
            console.error(`⚠️ Intento ${i}/${retries} fallido: ${error.message}`);
            if (i === retries) {
                console.error("❌ Se agotaron los intentos de migración.");
                return { success: false, error: error.message };
            }
            console.log(`Reintentando en ${delay/1000}s...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

async function performMigration() {
    // 0. Tablas Base
    await db.execute(`
        CREATE TABLE IF NOT EXISTS user_groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_level INT NOT NULL UNIQUE,
            group_name VARCHAR(50) NOT NULL,
            group_status TINYINT DEFAULT 1
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            user_level INT DEFAULT 3,
            status TINYINT DEFAULT 1,
            last_login TIMESTAMP NULL,
            phone VARCHAR(20),
            email VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name VARCHAR(255),
            file_path VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key VARCHAR(50) NOT NULL UNIQUE,
            setting_value VARCHAR(255) NOT NULL,
            description TEXT
        )
    `);

    // Insertar configuraciones base por defecto si no existen
    await db.execute(`INSERT OR IGNORE INTO settings (setting_key, setting_value, description) VALUES 
        ('bcv_rate', '1.00', 'Tasa de cambio del BCV a USD'),
        ('cleanup_mode', 'kardex_only', 'Modo de auto-limpieza: kardex_only o full_delete'),
        ('cleanup_days', '10', 'Días de retención de historial de ventas/kardex')
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            parent_id INT DEFAULT NULL
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(150) NOT NULL,
            quantity DECIMAL(10,3) DEFAULT 0.000,
            buy_price DECIMAL(10,2) DEFAULT 0,
            sale_price DECIMAL(10,2) DEFAULT 0,
            categorie_id INT DEFAULT NULL,
            media_id INT DEFAULT 0,
            date DATE,
            sku VARCHAR(50),
            barcode VARCHAR(100),
            min_stock DECIMAL(10,3) DEFAULT 0.000,
            is_weighable TINYINT DEFAULT 0
        )
    `);

    // Mejoras Idempotentes
    await safeAlter("ALTER TABLE users ADD COLUMN phone VARCHAR(20)");
    await safeAlter("ALTER TABLE users ADD COLUMN email VARCHAR(100)");
    await safeAlter("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    await safeAlter("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL");
    await safeAlter("ALTER TABLE products ADD COLUMN sku VARCHAR(50)");
    await safeAlter("ALTER TABLE products ADD COLUMN barcode VARCHAR(100)");
    await safeAlter("ALTER TABLE products ADD COLUMN min_stock DECIMAL(10,3) DEFAULT 0.000");
    await safeAlter("ALTER TABLE products ADD COLUMN is_weighable TINYINT DEFAULT 0");
    
    // Migración segura de tipos INT a DECIMAL(10,3)
    await safeAlter("ALTER TABLE products MODIFY COLUMN quantity DECIMAL(10,3) DEFAULT 0.000");
    await safeAlter("ALTER TABLE products MODIFY COLUMN min_stock DECIMAL(10,3) DEFAULT 0.000");
    await safeAlter("ALTER TABLE categories ADD COLUMN parent_id INT DEFAULT NULL");
    await safeAlter("ALTER TABLE customers ADD COLUMN cedula VARCHAR(20)");
    await safeAlter("ALTER TABLE suppliers ADD COLUMN cedula VARCHAR(20)");
    await safeAlter("ALTER TABLE suppliers ADD COLUMN status TINYINT DEFAULT 1");

    // Tablas Relacionales
    await db.execute(`
        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            contact_name VARCHAR(100),
            phone VARCHAR(20),
            email VARCHAR(100),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            cedula VARCHAR(20),
            email VARCHAR(100),
            address TEXT,
            credit_limit DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INT,
            user_id INT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'completed',
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS purchase_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            purchase_id INT,
            product_id INT,
            qty DECIMAL(10,3),
            unit_price DECIMAL(10,2),
            total DECIMAL(10,2),
            FOREIGN KEY (purchase_id) REFERENCES purchases(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS sales_header (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INT,
            user_id INT,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total DECIMAL(10,2),
            payment_method VARCHAR(50),
            status VARCHAR(20) DEFAULT 'completed',
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS sales_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INT,
            product_id INT,
            qty DECIMAL(10,3),
            unit_price DECIMAL(10,2),
            total DECIMAL(10,2),
            FOREIGN KEY (sale_id) REFERENCES sales_header(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS inventory_movements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INT,
            user_id INT,
            type VARCHAR(50),
            qty DECIMAL(10,3),
            reference VARCHAR(100),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS cash_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INT,
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_date TIMESTAMP NULL,
            start_balance DECIMAL(10,2),
            end_balance DECIMAL(10,2),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INT,
            action VARCHAR(100),
            table_name VARCHAR(50),
            record_id INT,
            old_value JSON,
            new_value JSON,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Alterar tablas existentes para aceptar decimales si ya fueron creadas antes
    await safeAlter("ALTER TABLE purchase_items MODIFY COLUMN qty DECIMAL(10,3)");
    await safeAlter("ALTER TABLE sales_items MODIFY COLUMN qty DECIMAL(10,3)");
    await safeAlter("ALTER TABLE inventory_movements MODIFY COLUMN qty DECIMAL(10,3)");

    // ✅ MEJORAS DE CRÉDITO CLIENTES
    await safeAlter("ALTER TABLE customers ADD COLUMN debt DECIMAL(10,2) DEFAULT 0.00");
    await safeAlter("ALTER TABLE sales_header ADD COLUMN pending_amount DECIMAL(10,2) DEFAULT 0.00");

    await db.execute(`
        CREATE TABLE IF NOT EXISTS customer_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INT,
            amount DECIMAL(10,2),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            note TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    `);

    // ✅ MEJORAS DE CRÉDITO PROVEEDORES
    await safeAlter("ALTER TABLE suppliers ADD COLUMN debt DECIMAL(10,2) DEFAULT 0.00");
    await safeAlter("ALTER TABLE purchases ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Contado'");
    await safeAlter("ALTER TABLE purchases ADD COLUMN pending_amount DECIMAL(10,2) DEFAULT 0.00");

    await db.execute(`
        CREATE TABLE IF NOT EXISTS supplier_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            supplier_id INT,
            amount DECIMAL(10,2),
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            note TEXT,
            FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        )
    `);

    // ✅ MEJORA DE RASTREO DE ANULACIONES
    await safeAlter("ALTER TABLE sales_header ADD COLUMN cancelled_at TIMESTAMP NULL");

    // ✅ REPARACIÓN DE DISCREPANCIA SOLICITADA
    // Reconectar ventas de crédito huérfanas que coincidan con la deuda de Gabriel
    await db.execute(`
        UPDATE sales_header 
        SET customer_id = (SELECT id FROM customers WHERE name LIKE '%gabriel orejas%' LIMIT 1)
        WHERE id = 91 AND customer_id IS NULL
    `);
}

async function safeAlter(sql) {
    try {
        await db.execute(sql);
    } catch (err) {
        // Ignorar errores de columnas duplicadas o alteraciones no soportadas por SQLite
        // console.log(`[SafeAlter] Ignorado: ${sql} - ${err.message}`);
    }
}

module.exports = migrate;
