const { randomUUID } = require('crypto');
const { getDatabase } = require('../db');

function parseJsonOrDefault(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapMessageRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    direction: row.direction,
    phone: row.phone,
    phoneNumbers: [row.phone],
    body: row.body,
    message: row.body,
    status: row.status,
    tags: parseJsonOrDefault(row.tags, []),
    extracted: parseJsonOrDefault(row.extracted, null),
    unread: !!row.unread,
    pinned: !!row.pinned,
    notes: row.notes,
    readAt: row.read_at,
    sentiment: row.sentiment,
    segments: row.segments,
    scheduledAt: row.scheduled_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

function insertMessage(input) {
  const db = getDatabase();
  const id = input.id || randomUUID();

  db.prepare(
    `
    INSERT INTO messages (id, direction, phone, body, status, tags, extracted, unread, pinned, notes, read_at, sentiment, segments, scheduled_at, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    id,
    input.direction,
    input.phone,
    input.body,
    input.status,
    input.tags ? JSON.stringify(input.tags) : null,
    input.extracted ? JSON.stringify(input.extracted) : null,
    input.unread !== undefined ? (input.unread ? 1 : 0) : 1,
    input.pinned ? 1 : 0,
    input.notes || null,
    input.readAt || null,
    input.sentiment || null,
    input.segments || 1,
    input.scheduledAt || null,
    input.sentAt || null,
  );

  return getMessageById(id);
}

function updateMessageStatus(id, status) {
  const db = getDatabase();
  db.prepare('UPDATE messages SET status = ?, sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP) WHERE id = ?').run(status, id);
  return getMessageById(id);
}

function getMessageById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  return mapMessageRow(row);
}

function deleteMessageById(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  return result.changes > 0;
}

function listMessages({ page = 1, limit = 25, direction, status, tag, phone, search }) {
  const db = getDatabase();
  const where = [];
  const args = [];

  if (direction) {
    where.push('direction = ?');
    args.push(direction);
  }

  if (status) {
    where.push('status = ?');
    args.push(status);
  }

  if (tag) {
    where.push('tags LIKE ?');
    args.push(`%\"${tag}\"%`);
  }

  if (phone) {
    where.push('phone = ?');
    args.push(phone);
  }

  if (search) {
    where.push('(body LIKE ? OR phone LIKE ?)');
    args.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const totalRow = db.prepare(`SELECT COUNT(*) as total FROM messages ${whereSql}`).get(...args);
  const rows = db.prepare(`SELECT * FROM messages ${whereSql} ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);

  return {
    page,
    limit,
    total: totalRow.total,
    items: rows.map(mapMessageRow),
  };
}

function listConversationByPhone(phone) {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM messages WHERE phone = ? ORDER BY datetime(created_at) ASC').all(phone);
  return rows.map(mapMessageRow);
}

function listAllMessagesForExport() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM messages ORDER BY datetime(created_at) DESC').all();
  return rows.map(mapMessageRow);
}

module.exports = {
  insertMessage,
  updateMessageStatus,
  getMessageById,
  deleteMessageById,
  listMessages,
  listConversationByPhone,
  listAllMessagesForExport,
};
