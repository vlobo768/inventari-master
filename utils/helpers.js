// helpers.js
const crypto = require("crypto");

// limpiar texto (equivalente remove_junk)
function removeJunk(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]*>?/gm, "") // strip tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// primera letra mayúscula (first_character)
function firstCharacter(str) {
  if (!str) return "";
  return str.replace(/-/g, " ").charAt(0).toUpperCase() + str.slice(1);
}

// validar campos (validate_fields)
function validateFields(data, fields) {
  const errors = [];

  fields.forEach((field) => {
    if (!data[field] || data[field].toString().trim() === "") {
      errors.push(`${field} no puede estar vacío`);
    }
  });

  return errors;
}

// generar fecha (make_date)
function makeDate() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// redirect (solo backend API no lo usa mucho)
function redirect(url) {
  return { redirect: url };
}

// count_id equivalente (frontend lo maneja)
let counter = 1;
function countId() {
  return counter++;
}

// total price (ventas)
function totalPrice(totals) {
  let sum = 0;
  let sub = 0;

  totals.forEach((t) => {
    sum += Number(t.total_saleing_price || 0);
    sub += Number(t.total_buying_price || 0);
  });

  return {
    total: sum,
    profit: sum - sub,
  };
}

module.exports = {
  removeJunk,
  firstCharacter,
  validateFields,
  makeDate,
  countId,
  totalPrice,
  redirect,
};