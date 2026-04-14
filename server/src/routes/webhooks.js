const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { z } = require('zod');
const { requireAdmin } = require('../middleware/auth');
const webhooksRepository = require('../repositories/webhooksRepository');

const router = express.Router();

const webhookSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  secret: z.string().optional(),
  enabled: z.boolean().optional().default(true),
  events: z.array(z.enum(['inbound', 'delivered', 'failed'])).optional().default(['inbound']),
});

const webhookClient = axios.create({ timeout: 10000 });

function buildTestPayload() {
  return {
    event: 'inbound',
    message: {
      id: 'test-message',
      direction: 'inbound',
      phone: '+15550000000',
      body: 'Test webhook payload from SMS Dashboard',
      status: 'received',
      tags: [],
      extracted: null,
    },
    timestamp: new Date().toISOString(),
  };
}

router.get('/webhooks', requireAdmin, (request, response, next) => {
  try {
    const items = webhooksRepository.listWebhooks();
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/webhooks', requireAdmin, (request, response, next) => {
  try {
    const parsed = webhookSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid webhook payload',
        status: 400,
      });
    }

    const webhook = webhooksRepository.createWebhook(parsed.data);
    return response.status(201).json(webhook);
  } catch (error) {
    return next(error);
  }
});

router.put('/webhooks/:id', requireAdmin, (request, response, next) => {
  try {
    const parsed = webhookSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid webhook payload',
        status: 400,
      });
    }

    const webhook = webhooksRepository.updateWebhook(Number(request.params.id), parsed.data);
    if (!webhook) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Webhook not found',
        status: 404,
      });
    }

    return response.json(webhook);
  } catch (error) {
    return next(error);
  }
});

router.delete('/webhooks/:id', requireAdmin, (request, response, next) => {
  try {
    const deleted = webhooksRepository.deleteWebhook(Number(request.params.id));
    if (!deleted) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Webhook not found',
        status: 404,
      });
    }

    return response.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/webhooks/:id/test', requireAdmin, async (request, response, next) => {
  try {
    const webhook = webhooksRepository.getWebhookById(Number(request.params.id));
    if (!webhook) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Webhook not found',
        status: 404,
      });
    }

    const payload = buildTestPayload();
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json' };

    if (webhook.secret) {
      const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
      headers['X-Signature'] = `sha256=${signature}`;
    }

    await webhookClient.post(webhook.url, payload, { headers });

    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
