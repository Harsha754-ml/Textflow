const express = require('express');
const { getDatabase } = require('../db');

const router = express.Router();

function toDateStart(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function toDateEnd(value, fallback) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

router.get('/analytics/summary', (request, response) => {
  const db = getDatabase();
  const from = toDateStart(request.query.from, '1970-01-01T00:00:00.000Z');
  const to = toDateEnd(request.query.to, new Date().toISOString());

  const row = db.prepare(
    `
    SELECT
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received,
      COUNT(*) as total
    FROM messages
    WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)
  `,
  ).get(from, to);

  response.json({
    from,
    to,
    sent: row.sent || 0,
    delivered: row.delivered || 0,
    failed: row.failed || 0,
    received: row.received || 0,
    total: row.total || 0,
  });
});

router.get('/analytics/volume', (request, response) => {
  const db = getDatabase();
  const from = toDateStart(request.query.from, '1970-01-01T00:00:00.000Z');
  const to = toDateEnd(request.query.to, new Date().toISOString());

  const rows = db.prepare(
    `
    SELECT
      date(created_at) as bucket,
      SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
    FROM messages
    WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY date(created_at)
    ORDER BY bucket ASC
  `,
  ).all(from, to);

  response.json({ from, to, items: rows });
});

router.get('/analytics/delivery-rate', (request, response) => {
  const db = getDatabase();
  const from = toDateStart(request.query.from, '1970-01-01T00:00:00.000Z');
  const to = toDateEnd(request.query.to, new Date().toISOString());

  const rows = db.prepare(
    `
    SELECT
      date(created_at) as bucket,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
    FROM messages
    WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY date(created_at)
    ORDER BY bucket ASC
  `,
  ).all(from, to);

  const items = rows.map((row) => ({
    bucket: row.bucket,
    delivered: row.delivered,
    outbound: row.outbound,
    rate: row.outbound > 0 ? Number(((row.delivered / row.outbound) * 100).toFixed(2)) : 0,
  }));

  response.json({ from, to, items });
});

router.get('/analytics/top-contacts', (request, response) => {
  const db = getDatabase();
  const limit = Math.max(Number(request.query.limit || 10), 1);
  const from = toDateStart(request.query.from, '1970-01-01T00:00:00.000Z');
  const to = toDateEnd(request.query.to, new Date().toISOString());
  const rows = db.prepare(
    `
    SELECT phone, COUNT(*) as total
    FROM messages
    WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY phone
    ORDER BY total DESC
    LIMIT ?
  `,
  ).all(from, to, limit);

  response.json({ from, to, items: rows });
});

module.exports = router;
