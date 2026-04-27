const jwt = require("jsonwebtoken");

const SECRET = "inventory_secret_key";

// generar login (equivalente login PHP)
function login(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.user_level,
    },
    SECRET,
    { expiresIn: "1d" }
  );
}

// verificar sesión (isUserLoggedIn)
function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
}

// logout (en JWT no se elimina, solo se deja expirar)
function logout() {
  return { success: true, msg: "Logout handled on client" };
}

module.exports = {
  login,
  verify,
  logout,
};