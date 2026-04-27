const path = require("path");

// CONFIG
const config = require("./config/config");

// DATABASE
const db = require("./database/db");

// HELPERS
const helpers = require("./utils/helpers");

// SESSION (JWT o memory session)
const session = require("./lib/session");

// UPLOAD
const upload = require("./lib/upload");

// SQL SERVICES
const sql = require("./services/sql");

module.exports = {
  path,
  config,
  db,
  helpers,
  session,
  upload,
  sql,
};