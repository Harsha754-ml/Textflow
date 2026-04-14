const bcrypt = require('bcryptjs');
const { getDatabase } = require('../db');

function mapUserRow(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    created_at: row.created_at,
  };
}

function listUsers() {
  const db = getDatabase();
  const rows = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY datetime(created_at) DESC').all();
  return rows.map(mapUserRow);
}

function createUser({ username, password, role }) {
  const db = getDatabase();
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, role);
  const row = db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  return mapUserRow(row);
}

function deleteUser(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  listUsers,
  createUser,
  deleteUser,
};
