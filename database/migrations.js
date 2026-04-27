const db = require('./db');

async function migrate() {
    console.log("Starting database migration...");
    try {

        // ============================================================
        // TABLAS BASE (deben existir antes de cualquier ALTER o FK)
        // ============================================================

        // 0a. Tabla user_groups
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                group_level INT NOT NULL UNIQUE,
                group_name VARCHAR(50) NOT NULL,
                group_status TINYINT DEFAULT 1
            )
        `);
        console.log("- user_groups table ensured.");

        // 0b. Tabla users (base)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
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
        console.log("- users table ensured.");

        // 0c. Tabla media
        await db.execute(`
            CREATE TABLE IF NOT EXISTS media (
                id INT AUTO_INCREMENT PRIMARY KEY,
                file_name VARCHAR(255),
                file_path VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("- media table ensured.");

        // 0d. Tabla categories
        await db.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                parent_id INT DEFAULT NULL
            )
        `);
        console.log("- categories table ensured.");

        // 0e. Tabla products
        await db.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                quantity INT DEFAULT 0,
                buy_price DECIMAL(10,2) DEFAULT 0,
                sale_price DECIMAL(10,2) DEFAULT 0,
                categorie_id INT DEFAULT NULL,
                media_id INT DEFAULT 0,
                date DATE,
                sku VARCHAR(50),
                barcode VARCHAR(100),
                min_stock INT DEFAULT 0
            )
        `);
        console.log("- products table ensured.");

        // ============================================================
        // MEJORAS A TABLAS EXISTENTES (idempotentes con IF NOT EXISTS)
        // ============================================================

        // 1. Users Table Enhancements
        await safeAlter("ALTER TABLE users ADD COLUMN phone VARCHAR(20)");
        await safeAlter("ALTER TABLE users ADD COLUMN email VARCHAR(100)");
        await safeAlter("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        await safeAlter("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL");
        console.log("- Users table enhanced.");

        // 2. Products Table Enhancements
        await safeAlter("ALTER TABLE products ADD COLUMN sku VARCHAR(50)");
        await safeAlter("ALTER TABLE products ADD COLUMN barcode VARCHAR(100)");
        await safeAlter("ALTER TABLE products ADD COLUMN min_stock INT DEFAULT 0");
        console.log("- Products table enhanced.");

        // 3. Categories parent_id (solo si no existe, sin FK para evitar duplicados)
        await safeAlter("ALTER TABLE categories ADD COLUMN parent_id INT DEFAULT NULL");
        console.log("- Categories table enhanced.");

        // ============================================================
        // TABLAS RELACIONALES
        // ============================================================

        // 4. Suppliers Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                contact_name VARCHAR(100),
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("- Suppliers table ensured.");

        // 5. Customers Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone VARCHAR(20),
                email VARCHAR(100),
                address TEXT,
                credit_limit DECIMAL(10,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("- Customers table ensured.");

        // 6. Purchases Header (nombre correcto: purchases)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS purchases (
                id INT AUTO_INCREMENT PRIMARY KEY,
                supplier_id INT,
                user_id INT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total DECIMAL(10,2),
                status VARCHAR(20) DEFAULT 'completed',
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log("- Purchases table ensured.");

        // 7. Purchase Items (nombre correcto: purchase_items)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS purchase_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                purchase_id INT,
                product_id INT,
                qty INT,
                unit_price DECIMAL(10,2),
                total DECIMAL(10,2),
                FOREIGN KEY (purchase_id) REFERENCES purchases(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);
        console.log("- Purchase items table ensured.");

        // 8. Sales Header
        await db.execute(`
            CREATE TABLE IF NOT EXISTS sales_header (
                id INT AUTO_INCREMENT PRIMARY KEY,
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
        console.log("- Sales header table ensured.");

        // 9. Sales Items
        await db.execute(`
            CREATE TABLE IF NOT EXISTS sales_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sale_id INT,
                product_id INT,
                qty INT,
                unit_price DECIMAL(10,2),
                total DECIMAL(10,2),
                FOREIGN KEY (sale_id) REFERENCES sales_header(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);
        console.log("- Sales items table ensured.");

        // 10. Inventory Movements (Kardex)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS inventory_movements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT,
                user_id INT,
                type ENUM('IN', 'OUT', 'ADJUSTMENT'),
                qty INT,
                reference VARCHAR(100),
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log("- Inventory movements table ensured.");

        // 11. Cash Sessions
        await db.execute(`
            CREATE TABLE IF NOT EXISTS cash_sessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_date TIMESTAMP NULL,
                start_balance DECIMAL(10,2),
                end_balance DECIMAL(10,2),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        console.log("- Cash sessions table ensured.");

        // 12. Audit Log
        await db.execute(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
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
        console.log("- Audit log table ensured.");

        console.log("✅ Database migration completed successfully!");
    } catch (error) {
        console.error("❌ Database migration failed:", error);
        throw error;
    }
}

/**
 * Ejecuta un ALTER TABLE ignorando el error si la columna ya existe (MySQL error 1060).
 */
async function safeAlter(sql) {
    try {
        await db.execute(sql);
    } catch (err) {
        // 1060 = Duplicate column name — ignorar
        if (err.errno !== 1060 && err.code !== 'ER_DUP_FIELDNAME') {
            throw err;
        }
    }
}

module.exports = migrate;
