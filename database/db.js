const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const sqlite = new Database(dbPath);

sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

function translateSql(sql) {
    let translated = sql;
    translated = translated.replace(/\bNOW\(\)/gi, "datetime('now', 'localtime')");
    translated = translated.replace(/\bCURDATE\(\)/gi, "date('now', 'localtime')");
    translated = translated.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d %H:%i'\)/gi, "strftime('%Y-%m-%d %H:%M', $1)");
    translated = translated.replace(/\bYEAR\(([^)]+)\)/gi, "strftime('%Y', $1)");
    translated = translated.replace(/\bMONTH\(([^)]+)\)/gi, "strftime('%m', $1)");
    translated = translated.replace(/\bMONTHNAME\(([^)]+)\)/gi, "CASE strftime('%m', $1) WHEN '01' THEN 'January' WHEN '02' THEN 'February' WHEN '03' THEN 'March' WHEN '04' THEN 'April' WHEN '05' THEN 'May' WHEN '06' THEN 'June' WHEN '07' THEN 'July' WHEN '08' THEN 'August' WHEN '09' THEN 'September' WHEN '10' THEN 'October' WHEN '11' THEN 'November' WHEN '12' THEN 'December' END");
    return translated;
}

const connectionMock = {
    execute: async (sql, params = []) => {
        const translatedSql = translateSql(sql);
        const cleanParams = params.map(p => p === undefined ? null : p);
        try {
            const stmt = sqlite.prepare(translatedSql);
            if (translatedSql.trim().toUpperCase().startsWith('SELECT') || translatedSql.trim().toUpperCase().startsWith('PRAGMA')) {
                const rows = stmt.all(cleanParams);
                return [rows, []];
            } else {
                const info = stmt.run(cleanParams);
                return [{
                    insertId: info.lastInsertRowid,
                    affectedRows: info.changes
                }, []];
            }
        } catch (e) {
            if (e.message.includes('UNIQUE constraint failed')) {
                e.code = 'ER_DUP_ENTRY';
            }
            throw e;
        }
    },
    query: async (sql, params) => connectionMock.execute(sql, params),
    beginTransaction: async () => {
        if (!sqlite.inTransaction) sqlite.prepare('BEGIN').run();
    },
    commit: async () => {
        if (sqlite.inTransaction) sqlite.prepare('COMMIT').run();
    },
    rollback: async () => {
        if (sqlite.inTransaction) sqlite.prepare('ROLLBACK').run();
    },
    release: () => {}
};

module.exports = {
    execute: connectionMock.execute,
    query: connectionMock.query,
    getConnection: async () => connectionMock,
    testConnection: async () => {
        try {
             sqlite.prepare('SELECT 1').get();
             return { success: true };
        } catch (e) {
             console.error('❌ DB Connection Test Failed:', e.message);
             return { success: false, error: e.message };
        }
    },
    pool: connectionMock,
    sqlite
};
