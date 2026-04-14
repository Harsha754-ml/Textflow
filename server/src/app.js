const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const config = require('./config');
const smsGateClient = require('./services/smsGateClient');
const queueService = require('./services/queueService');
const { toCsv } = require('./utils/csv');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: config.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

function validateSendPayload(body) {
  const errors = [];
  const phoneNumberPattern = /^\+[1-9]\d{7,14}$/;

  if (!body || !Array.isArray(body.phoneNumbers) || body.phoneNumbers.length === 0) {
    errors.push('phoneNumbers must be a non-empty array');
  } else if (body.phoneNumbers.some((phoneNumber) => typeof phoneNumber !== 'string' || !phoneNumberPattern.test(phoneNumber.trim()))) {
    errors.push('phoneNumbers must use E.164 format, for example +918885349267');
  }
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    errors.push('message is required');
  }
  if (body.scheduleAt && Number.isNaN(Date.parse(body.scheduleAt))) {
    errors.push('scheduleAt must be a valid ISO 8601 timestamp');
  }
  return errors;
}

app.post('/api/send-sms', async (request, response, next) => {
  try {
    const errors = validateSendPayload(request.body);
    if (errors.length > 0) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        code: 'VALIDATION_ERROR',
        message: errors.join('; '),
      });
    }

    const payload = {
      phoneNumbers: request.body.phoneNumbers,
      message: request.body.message.trim(),
      scheduleAt: request.body.scheduleAt || null,
    };

    if (payload.scheduleAt) {
      const queueItem = queueService.scheduleMessage(payload);
      return response.status(202).json({
        queued: true,
        item: queueItem,
      });
    }

    const { record, responseData } = await queueService.sendImmediately(payload);
    return response.status(200).json({
      queued: false,
      message: record,
      upstream: responseData,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/messages', async (request, response, next) => {
  try {
    const page = Math.max(Number(request.query.page || 1), 1);
    const limit = Math.max(Number(request.query.limit || 25), 1);

    try {
      const upstream = await smsGateClient.listMessages({ page, limit });
      return response.json(upstream);
    } catch (error) {
      const history = queueService.getHistory();
      const startIndex = (page - 1) * limit;
      return response.json({
        page,
        limit,
        total: history.length,
        items: history.slice(startIndex, startIndex + limit),
        source: 'local-cache',
      });
    }
  } catch (error) {
    return next(error);
  }
});

app.get('/api/messages/:id', async (request, response, next) => {
  try {
    const localRecord = queueService.findHistoryRecord(request.params.id);
    if (localRecord) {
      return response.json(localRecord);
    }

    const upstream = await smsGateClient.getMessage(request.params.id);
    return response.json(upstream);
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/messages/:id', async (request, response, next) => {
  try {
    const deleted = queueService.deleteHistoryRecord(request.params.id);
    let upstream = null;

    try {
      upstream = await smsGateClient.deleteMessage(request.params.id);
    } catch (error) {
      if (!deleted) {
        throw error;
      }
    }

    return response.json({ deleted, upstream });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/messages/export', async (request, response, next) => {
  try {
    const history = queueService.getHistory();
    const csv = toCsv(history);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="messages.csv"');
    return response.send(csv);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/queue', (request, response) => {
  response.json({ items: queueService.getQueueState() });
});

app.post('/api/queue/:id/retry', (request, response) => {
  const item = queueService.retryQueueItem(request.params.id);
  if (!item) {
    return response.status(404).json({
      error: 'NOT_FOUND',
      code: 'QUEUE_ITEM_NOT_FOUND',
      message: 'Queue item not found',
    });
  }

  return response.json({ item });
});

app.get('/api/status', async (request, response, next) => {
  try {
    const status = await smsGateClient.probeReachability();
    return response.json(status);
  } catch (error) {
    return next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
