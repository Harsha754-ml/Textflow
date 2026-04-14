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

function mapRule(row) {
  return {
    id: row.id,
    name: row.name,
    enabled: Boolean(row.enabled),
    trigger_type: row.trigger_type,
    trigger_value: row.trigger_value,
    action_type: row.action_type,
    action_config: parseJson(row.action_config, {}),
    priority: row.priority,
    created_at: row.created_at,
  };
}

function mapLog(row) {
  return {
    id: row.id,
    rule_id: row.rule_id,
    message_id: row.message_id,
    matched: Boolean(row.matched),
    action_taken: row.action_taken,
    result: row.result,
    error: row.error,
    created_at: row.created_at,
  };
}

function listRules() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM automation_rules ORDER BY priority DESC, id DESC').all();
  return rows.map(mapRule);
}

function getRuleById(id) {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(id);
  return row ? mapRule(row) : null;
}

function createRule(input) {
  const db = getDatabase();
  const result = db.prepare(
    `
    INSERT INTO automation_rules (name, enabled, trigger_type, trigger_value, action_type, action_config, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    input.name,
    input.enabled ? 1 : 0,
    input.trigger_type,
    input.trigger_value || '',
    input.action_type,
    JSON.stringify(input.action_config || {}),
    input.priority || 0,
  );

  return getRuleById(result.lastInsertRowid);
}

function updateRule(id, input) {
  const db = getDatabase();
  db.prepare(
    `
    UPDATE automation_rules
    SET name = ?, enabled = ?, trigger_type = ?, trigger_value = ?, action_type = ?, action_config = ?, priority = ?
    WHERE id = ?
  `,
  ).run(
    input.name,
    input.enabled ? 1 : 0,
    input.trigger_type,
    input.trigger_value || '',
    input.action_type,
    JSON.stringify(input.action_config || {}),
    input.priority || 0,
    id,
  );

  return getRuleById(id);
}

function toggleRule(id) {
  const db = getDatabase();
  db.prepare('UPDATE automation_rules SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
  return getRuleById(id);
}

function deleteRule(id) {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);
  return result.changes > 0;
}

function insertLog(input) {
  const db = getDatabase();
  const result = db.prepare(
    `
    INSERT INTO automation_logs (rule_id, message_id, matched, action_taken, result, error)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    input.rule_id,
    input.message_id,
    input.matched ? 1 : 0,
    input.action_taken,
    input.result,
    input.error || null,
  );

  const row = db.prepare('SELECT * FROM automation_logs WHERE id = ?').get(result.lastInsertRowid);
  return mapLog(row);
}

function listLogs({ ruleId, page = 1, limit = 25 }) {
  const db = getDatabase();
  const where = [];
  const args = [];

  if (ruleId) {
    where.push('rule_id = ?');
    args.push(ruleId);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const total = db.prepare(`SELECT COUNT(*) as total FROM automation_logs ${whereSql}`).get(...args).total;
  const rows = db
    .prepare(`SELECT * FROM automation_logs ${whereSql} ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`)
    .all(...args, limit, offset);

  return {
    page,
    limit,
    total,
    items: rows.map(mapLog),
  };
}

function hasMessageBeenProcessed(messageId) {
  const db = getDatabase();
  const row = db.prepare('SELECT id FROM automation_logs WHERE message_id = ? LIMIT 1').get(messageId);
  return Boolean(row);
}

function listUnprocessedInboundMessages(limit = 100) {
  const db = getDatabase();
  const rows = db.prepare(
    `
    SELECT * FROM messages
    WHERE direction = 'inbound' AND id NOT IN (SELECT message_id FROM automation_logs)
    ORDER BY datetime(created_at) ASC
    LIMIT ?
  `,
  ).all(limit);

  return rows.map((row) => ({
    id: row.id,
    phone: row.phone,
    body: row.body,
    status: row.status,
    created_at: row.created_at,
    extracted: parseJson(row.extracted, null),
    tags: parseJson(row.tags, []),
  }));
}

function updateMessageTagsAndExtracted(messageId, tags, extracted) {
  const db = getDatabase();
  db.prepare('UPDATE messages SET tags = ?, extracted = ? WHERE id = ?').run(
    JSON.stringify(tags || []),
    extracted ? JSON.stringify(extracted) : null,
    messageId,
  );
}

module.exports = {
  listRules,
  getRuleById,
  createRule,
  updateRule,
  toggleRule,
  deleteRule,
  insertLog,
  listLogs,
  hasMessageBeenProcessed,
  listUnprocessedInboundMessages,
  updateMessageTagsAndExtracted,
};
