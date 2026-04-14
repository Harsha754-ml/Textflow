const { getDatabase } = require('../db');

function mapAuditLogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details,
    createdAt: row.created_at,
  };
}

function listAuditLogs({ page = 1, limit = 50 }) {
  const db = getDatabase();
  const offset = (page - 1) * limit;
  
  const totalRow = db.prepare('SELECT COUNT(*) as total FROM audit_logs').get();
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?').all(limit, offset);
  
  return {
    page,
    limit,
    total: totalRow.total,
    items: rows.map(mapAuditLogRow)
  };
}

function logAction({ userId, action, targetType = null, targetId = null, details = null }) {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)').run(
    userId || null,
    action,
    targetType,
    targetId,
    details ? JSON.stringify(details) : null
  );
  
  const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(result.lastInsertRowid);
  return mapAuditLogRow(row);
}

module.exports = {
  listAuditLogs,
  logAction
};
