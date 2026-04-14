const { getDatabase } = require('../db');

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapWebhook(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    secret: row.secret,
    enabled: Boolean(row.enabled),
    events: parseJson(row.events, []),
    created_at: row.created_at,
  };
}

function listWebhooks() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM webhooks ORDER BY datetime(created_at) DESC').all();
  return rows.map(mapWebhook);
}

function listWebhooksByEvent(eventType) {
  const normalizedEvent = String(eventType || '').trim().toLowerCase();

  return listWebhooks().filter((webhook) => {
    if (!webhook.enabled) {
      return false;
    }

    return Array.isArray(webhook.events)
      && webhook.events.some((eventName) => String(eventName || '').trim().toLowerCase() === normalizedEvent);
  });
}

function getWebhookById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
  return row ? mapWebhook(row) : null;
}

function createWebhook(input) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO webhooks (name, url, secret, enabled, events) VALUES (?, ?, ?, ?, ?)').run(
    input.name,
    input.url,
    input.secret || null,
    input.enabled ? 1 : 0,
    JSON.stringify(input.events || []),
  );

  const row = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(result.lastInsertRowid);
  return mapWebhook(row);
}

function updateWebhook(id, input) {
  const db = getDatabase();
  db.prepare('UPDATE webhooks SET name = ?, url = ?, secret = ?, enabled = ?, events = ? WHERE id = ?').run(
    input.name,
    input.url,
    input.secret || null,
    input.enabled ? 1 : 0,
    JSON.stringify(input.events || []),
    id,
  );

  const row = db.prepare('SELECT * FROM webhooks WHERE id = ?').get(id);
  return row ? mapWebhook(row) : null;
}

function deleteWebhook(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM webhooks WHERE id = ?').run(id);
  return result.changes > 0;
}

module.exports = {
  listWebhooks,
  listWebhooksByEvent,
  getWebhookById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
};
