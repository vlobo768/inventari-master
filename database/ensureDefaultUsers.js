const db = require('../database/db');
const crypto = require('crypto');

/**
 * Default Users and Roles Management
 */
async function ensureDefaultUsers() {
    try {
        // 1. Ensure Roles exist
        const roles = [
            { level: 1, name: 'ADMIN', status: 1 },
            { level: 2, name: 'MANTENIMIENTO', status: 1 },
            { level: 3, name: 'USER', status: 1 }
        ];

        for (const role of roles) {
            await db.execute(
                "INSERT IGNORE INTO user_groups (group_level, group_name, group_status) VALUES (?, ?, ?)",
                [role.level, role.name, role.status]
            );
        }

        // 2. Default Users Definition
        const defaultUsers = [
            {
                name: 'Administrador Maestro',
                username: 'admin',
                password: 'admin123',
                level: 1,
                email: 'admin@tienda.com'
            },
            {
                name: 'Soporte Técnico',
                username: 'mantenimiento',
                password: 'maintenance2026',
                level: 2,
                email: 'soporte@tienda.com'
            },
            {
                name: 'Empleado Ventas',
                username: 'usuario',
                password: 'user123',
                level: 3,


                email: 'empleado@tienda.com'
            }
        ];

        for (const u of defaultUsers) {
            const [exists] = await db.execute("SELECT id FROM users WHERE username = ?", [u.username]);
            if (exists.length === 0) {
                const hashedPassword = crypto.createHash('sha1').update(u.password).digest('hex');
                await db.execute(
                    "INSERT INTO users (name, username, password, user_level, status, email) VALUES (?, ?, ?, ?, 1, ?)",
                    [u.name, u.username, hashedPassword, u.level, u.email]
                );
                console.log(`Usuario por defecto creado: ${u.username}`);
            }
        }
    } catch (error) {
        console.error("Error asegurando usuarios por defecto:", error);
    }
}

module.exports = ensureDefaultUsers;
