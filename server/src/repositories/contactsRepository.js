const { getDatabase } = require('../db');

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


function mapContactRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    group_name: row.group_name,
    notes: row.notes,
    tags: parseJsonOrDefault(row.tags, []),
    dnc: !!row.dnc,
    created_at: row.created_at,
  };
}

function listContacts({ group, search }) {
  const db = getDatabase();
  const where = [];
  const args = [];

  if (group) {
    where.push('group_name = ?');
    args.push(group);
  }

  if (search) {
    where.push('(name LIKE ? OR phone LIKE ? OR notes LIKE ?)');
    args.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM contacts ${whereSql} ORDER BY datetime(created_at) DESC`).all(...args);
  return rows.map(mapContactRow);
}

function createContact(input) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO contacts (name, phone, group_name, notes, tags, dnc) VALUES (?, ?, ?, ?, ?, ?)').run(
    input.name,
    input.phone,
    input.group_name || null,
    input.notes || null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.dnc ? 1 : 0
  );

  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  return mapContactRow(row);
}

function updateContact(id, input) {
  const db = getDatabase();
  db.prepare('UPDATE contacts SET name = ?, phone = ?, group_name = ?, notes = ?, tags = ?, dnc = ? WHERE id = ?').run(
    input.name,
    input.phone,
    input.group_name || null,
    input.notes || null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.dnc ? 1 : 0,
    id,
  );

  const row = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
  return row ? mapContactRow(row) : null;
}

function deleteContact(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
  return result.changes > 0;
}

function listGroups() {
  const db = getDatabase();
  const rows = db.prepare("SELECT DISTINCT group_name FROM contacts WHERE group_name IS NOT NULL AND group_name != '' ORDER BY group_name ASC").all();
  return rows.map((row) => row.group_name);
}

module.exports = {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listGroups,
};
