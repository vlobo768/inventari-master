const mysql = require('mysql2');

/**
 * CONFIGURACIÓN CENTRALIZADA DE BASE DE DATOS
 * Se utiliza 127.0.0.1 en lugar de localhost para evitar conflictos de resolución IPv6 (::1)
 */
const pool = mysql.createPool({
    host: '127.0.0.1', 
    user: 'root',
    password: '',
    database: 'oswa_inv',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
});

const promisePool = pool.promise();

/**
 * Verifica la disponibilidad de la base de datos
 */
async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        await connection.ping();
        connection.release();
        return { success: true };
    } catch (error) {
        console.error('❌ DB Connection Test Failed:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    execute: async (sql, params) => {
        try { return await promisePool.execute(sql, params); } 
        catch (e) { 
            if (e.code === 'ECONNRESET') return await promisePool.execute(sql, params); 
            throw e; 
        }
    },
    query: async (sql, params) => {
        try { return await promisePool.query(sql, params); } 
        catch (e) { 
            if (e.code === 'ECONNRESET') return await promisePool.query(sql, params); 
            throw e; 
        }
    },
    getConnection: () => promisePool.getConnection(),
    testConnection,
    pool: promisePool
};
