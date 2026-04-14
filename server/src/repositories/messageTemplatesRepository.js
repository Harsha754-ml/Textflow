const { getDatabase } = require('../db');

function mapTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  };
}

function listTemplates() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM message_templates ORDER BY datetime(created_at) DESC').all();
  return rows.map(mapTemplateRow);
}

function createTemplate(input) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO message_templates (title, body) VALUES (?, ?)').run(
    input.title,
    input.body
  );
  
  const row = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(result.lastInsertRowid);
  return mapTemplateRow(row);
}

function deleteTemplate(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM message_templates WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  listTemplates,
  createTemplate,
  deleteTemplate
};
