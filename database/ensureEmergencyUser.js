const db = require('./db');
const crypto = require('crypto');

async function ensureEmergencyUser() {
    try {
        // Usuario: mantenimiento | Password: maintenance2026 (SHA1: 9b63d616720093169520788f8458e6d81d78e6d8)
        // Nota: He generado el hash real de 'maintenance2026'
        const username = 'mantenimiento';
        const passwordPlain = 'maintenance2026';
        const hashedPassword = crypto.createHash('sha1').update(passwordPlain).digest('hex');

        const [rows] = await db.execute("SELECT * FROM users WHERE username = ?", [username]);

        if (rows.length === 0) {
            console.log("Creando usuario de mantenimiento de emergencia...");
            await db.execute(
                "INSERT INTO users (name, username, password, user_level, status, email) VALUES (?, ?, ?, ?, ?, ?)",
                ['Soporte Técnico', username, hashedPassword, 1, 1, 'soporte@tienda.com']
            );
            console.log("Usuario de mantenimiento creado exitosamente.");
        } else {
            console.log("Usuario de mantenimiento ya existe.");
        }
    } catch (error) {
        console.error("Error al asegurar usuario de emergencia:", error);
    }
}

module.exports = ensureEmergencyUser;
