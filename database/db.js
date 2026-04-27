const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'oswa_inv', // <--- Cambia 'mi_proyecto' por 'oswa_inv'
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Polyfills for legacy sqlite3 methods (db.all, db.get, db.run)
promisePool.get = function(sql, params, callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    this.execute(sql, params)
        .then(([rows]) => callback(null, rows[0] || null))
        .catch(err => callback(err, null));
};

promisePool.all = function(sql, params, callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    this.execute(sql, params)
        .then(([rows]) => callback(null, rows))
        .catch(err => callback(err, null));
};

promisePool.run = function(sql, params, callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    this.execute(sql, params)
        .then(([result]) => {
            const context = { changes: result.affectedRows, lastID: result.insertId };
            if (callback) callback.call(context, null);
        })
        .catch(err => {
            if (callback) callback.call({}, err);
        });
};

module.exports = promisePool;