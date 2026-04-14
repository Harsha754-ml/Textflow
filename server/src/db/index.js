const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('../config');
const schemaStatements = require('./schema');

let db;

function getDbPath() {
  return path.resolve(__dirname, '..', '..', config.dbPath);
}

function openDatabase() {
  if (db) {
    return db;
  }

  const dbPath = getDbPath();
  const dbDir = path.dirname(dbPath);
  fs.mkdirSync(dbDir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

function runSchema(database) {
  for (const statement of schemaStatements) {
    database.prepare(statement).run();
  }
}

function bootstrapAdminUser(database) {
  if (!config.bootstrapAdminUsername || !config.bootstrapAdminPassword) {
    return;
  }

  const existingUser = database
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(config.bootstrapAdminUsername);

  if (existingUser) {
    return;
  }

  const passwordHash = bcrypt.hashSync(config.bootstrapAdminPassword, 10);
  database
    .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
    .run(config.bootstrapAdminUsername, passwordHash, 'admin');
}

function initDatabase() {
  const database = openDatabase();
  runSchema(database);
  bootstrapAdminUser(database);
  return database;
}

function getDatabase() {
  if (!db) {
    return initDatabase();
  }

  return db;
}

module.exports = {
  initDatabase,
  getDatabase,
};
