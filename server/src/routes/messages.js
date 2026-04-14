const { randomUUID } = require('crypto');
const express = require('express');
const { z } = require('zod');
const smsGateClient = require('../services/smsGateClient');
const queueService = require('../services/queueService');
const { dispatchRegisteredWebhooks } = require('../services/automationService');
const { toCsv } = require('../utils/csv');
const { requireAdmin } = require('../middleware/auth');
const messagesRepository = require('../repositories/messagesRepository');

const router = express.Router();

const sendSchema = z.object({
  phoneNumbers: z.array(z.string().regex(/^\+[1-9]\d{7,14}$/)).min(1),
  message: z.string().min(1),
  scheduleAt: z.string().datetime().optional(),
});

function normalizeMessageForExport(row) {
  return {
    id: row.id,
    phoneNumbers: row.phoneNumbers,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
    scheduledAt: row.scheduledAt,
    attempts: 0,
    lastError: '',
  };
}

async function handleSend(request, response, next) {
  try {
    const parsed = sendSchema.safeParse(request.body);

    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid send payload',
        status: 400,
      });
    }

    const payload = parsed.data;

    if (payload.scheduleAt) {
      const queueItem = queueService.scheduleMessage(payload);
      return response.status(202).json({ queued: true, item: queueItem });
    }

    const results = [];

    for (const phone of payload.phoneNumbers) {
      try {
        const upstream = await smsGateClient.sendMessage({
          phoneNumbers: [phone],
          message: payload.message,
        });

        const inserted = messagesRepository.insertMessage({
          id: upstream.id || randomUUID(),
          direction: 'outbound',
          phone,
          body: payload.message,
          status: upstream.state ? String(upstream.state).toLowerCase() : 'sent',
          tags: [],
          extracted: null,
          scheduledAt: null,
          sentAt: new Date().toISOString(),
        });

        const normalizedStatus = String(inserted.status || '').toLowerCase();
        if (normalizedStatus === 'delivered' || normalizedStatus === 'failed') {
          void dispatchRegisteredWebhooks(normalizedStatus, inserted);
        }

        results.push({ phone, ok: true, message: inserted, upstream });
      } catch (error) {
        const failed = messagesRepository.insertMessage({
          id: `failed-${randomUUID()}`,
          direction: 'outbound',
          phone,
          body: payload.message,
          status: 'failed',
          tags: [],
          extracted: null,
          scheduledAt: null,
          sentAt: new Date().toISOString(),
        });

        void dispatchRegisteredWebhooks('failed', failed);

        results.push({ phone, ok: false, message: failed, error: error.message });
      }
    }

    const allFailed = results.every((item) => !item.ok);
    return response.status(allFailed ? 502 : 200).json({
      queued: false,
      results,
    });
  } catch (error) {
    return next(error);
  }
}

router.post('/send', requireAdmin, handleSend);
router.post('/send-sms', requireAdmin, handleSend);

router.get('/messages', (request, response, next) => {
  try {
    const page = Math.max(Number(request.query.page || 1), 1);
    const limit = Math.max(Number(request.query.limit || 25), 1);

    const result = messagesRepository.listMessages({
      page,
      limit,
      direction: request.query.direction,
      status: request.query.status,
      tag: request.query.tag,
      phone: request.query.phone,
      search: request.query.search,
    });

    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/messages/export', (request, response, next) => {
  try {
    const rows = messagesRepository.listAllMessagesForExport().map(normalizeMessageForExport);
    const csv = toCsv(rows);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="messages.csv"');
    return response.send(csv);
  } catch (error) {
    return next(error);
  }
});

router.get('/messages/:id', (request, response, next) => {
  try {
    const row = messagesRepository.getMessageById(request.params.id);
    if (!row) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Message not found',
        status: 404,
      });
    }

    return response.json(row);
  } catch (error) {
    return next(error);
  }
});

router.delete('/messages/:id', requireAdmin, async (request, response, next) => {
  try {
    const deleted = messagesRepository.deleteMessageById(request.params.id);

    try {
      await smsGateClient.deleteMessage(request.params.id);
    } catch {
      // Local deletion still succeeds for history cleanup.
    }

    if (!deleted) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Message not found',
        status: 404,
      });
    }

    return response.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/conversations/:phone', (request, response, next) => {
  try {
    const items = messagesRepository.listConversationByPhone(request.params.phone);
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
