const db = require('../database/db');
const crypto = require('crypto');

// hash SHA1 (compatible con el sistema existente)
function hash(password) {
  return crypto.createHash('sha1').update(password).digest('hex');
}

// Autenticación con roles (usando mysql2 async/await)
async function authenticateV2(username, password) {
  try {
    const hashed = hash(password);
    const [rows] = await db.execute(
      `SELECT id, username, user_level FROM users WHERE username = ? AND password = ? LIMIT 1`,
      [username, hashed]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    // Actualizar último login (MySQL NOW())
    await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

    return user;
  } catch (err) {
    console.error("Error en authenticateV2:", err);
    throw err;
  }
}

let currentUser = null;

function login(user) {
  currentUser = user;
}

function logout() {
  currentUser = null;
}

function isLoggedIn() {
  return currentUser !== null;
}

function getUser() {
  return currentUser;
}

module.exports = {
  login,
  logout,
  isLoggedIn,
  getUser,
  authenticateV2
};