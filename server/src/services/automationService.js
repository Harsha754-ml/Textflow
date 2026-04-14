const cron = require('node-cron');
const axios = require('axios');
const crypto = require('crypto');
const automationRepository = require('../repositories/automationRepository');
const webhooksRepository = require('../repositories/webhooksRepository');
const messagesRepository = require('../repositories/messagesRepository');
const smsGateClient = require('./smsGateClient');

const webhookClient = axios.create({ timeout: 10000 });
let automationCycleRunning = false;

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeMessage(message) {
  if (!message) {
    return null;
  }

  return {
    ...message,
    tags: Array.isArray(message.tags) ? message.tags : [],
    extracted: message.extracted || null,
  };
}

function buildWebhookPayload(eventType, message, extra = {}) {
  return {
    event: eventType,
    message: normalizeMessage(message),
    extractedData: extra.extractedData || normalizeMessage(message)?.extracted || undefined,
    timestamp: new Date().toISOString(),
  };
}

function isRuleMatch(rule, body) {
  const text = normalizeText(body);
  const triggerValue = normalizeText(rule.trigger_value);

  if (rule.trigger_type === 'any') {
    return true;
  }

  if (rule.trigger_type === 'keyword') {
    return text.toLowerCase().includes(triggerValue.toLowerCase());
  }

  if (rule.trigger_type === 'regex') {
    try {
      return new RegExp(triggerValue).test(text);
    } catch {
      return false;
    }
  }

  return false;
}

async function sendWebhookWithRetry(url, payload, secret) {
  const delays = [30_000, 120_000, 600_000];
  let lastError = null;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    try {
      const body = JSON.stringify(payload);
      const headers = { 'Content-Type': 'application/json' };

      if (secret) {
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
        headers['X-Signature'] = `sha256=${signature}`;
      }

      await webhookClient.post(url, payload, { headers });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < delays.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw lastError || new Error('Webhook delivery failed');
}

async function dispatchRegisteredWebhooks(eventType, message, extra = {}) {
  const targets = webhooksRepository.listWebhooksByEvent(eventType);

  if (targets.length === 0) {
    return { event: eventType, delivered: 0, failed: 0, total: 0 };
  }

  const payload = buildWebhookPayload(eventType, message, extra);
  const settled = await Promise.allSettled(
    targets.map(async (webhook) => {
      await sendWebhookWithRetry(webhook.url, payload, webhook.secret || null);
      automationRepository.insertLog({
        rule_id: null,
        message_id: message?.id || null,
        matched: true,
        action_taken: `webhook:${eventType}:${webhook.id}`,
        result: 'success',
      });
    }),
  );

  let delivered = 0;
  let failed = 0;

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      delivered += 1;
      return;
    }

    failed += 1;
    automationRepository.insertLog({
      rule_id: null,
      message_id: message?.id || null,
      matched: true,
      action_taken: `webhook:${eventType}:${targets[index].id}`,
      result: 'failed',
      error: result.reason?.message || 'Webhook delivery failed',
    });
  });

  return { event: eventType, delivered, failed, total: targets.length };
}

async function executeAction(rule, message) {
  const config = rule.action_config || {};

  if (rule.action_type === 'auto_reply') {
    const replyBody = normalizeText(config.body || 'Acknowledged');
    await smsGateClient.sendMessage({
      phoneNumbers: [message.phone],
      message: replyBody,
    });

    messagesRepository.insertMessage({
      direction: 'outbound',
      phone: message.phone,
      body: replyBody,
      status: 'sent',
      tags: [],
      extracted: null,
      sentAt: new Date().toISOString(),
    });

    return { action: 'auto_reply' };
  }

  if (rule.action_type === 'tag') {
    const tag = normalizeText(config.tag || 'tagged');
    const currentTags = Array.isArray(message.tags) ? message.tags : [];
    const nextTags = currentTags.includes(tag) ? currentTags : [...currentTags, tag];
    automationRepository.updateMessageTagsAndExtracted(message.id, nextTags, message.extracted || null);
    return { action: 'tag', tag };
  }

  if (rule.action_type === 'extract') {
    const template = normalizeText(config.template);
    if (!template) {
      return { action: 'extract', extracted: null };
    }

    const regex = new RegExp(template);
    const match = message.body.match(regex);
    const extracted = match?.groups || null;
    automationRepository.updateMessageTagsAndExtracted(message.id, message.tags || [], extracted);
    return { action: 'extract', extracted };
  }

  if (rule.action_type === 'webhook') {
    const url = normalizeText(config.url);
    if (!url) {
      throw new Error('Webhook URL is required');
    }

    await sendWebhookWithRetry(url, buildWebhookPayload('inbound', message), config.secret || null);

    return { action: 'webhook', url };
  }

  return { action: 'none' };
}

async function processInboundMessage(message) {
  const normalizedMessage = normalizeMessage(message);

  if (!normalizedMessage) {
    return;
  }

  void dispatchRegisteredWebhooks('inbound', normalizedMessage);

  const rules = automationRepository.listRules().filter((rule) => rule.enabled);

  for (const rule of rules) {
    const matched = isRuleMatch(rule, normalizedMessage.body);

    if (!matched) {
      continue;
    }

    try {
      const outcome = await executeAction(rule, normalizedMessage);
      automationRepository.insertLog({
        rule_id: rule.id,
        message_id: normalizedMessage.id,
        matched: true,
        action_taken: outcome.action,
        result: 'success',
      });
      return;
    } catch (error) {
      automationRepository.insertLog({
        rule_id: rule.id,
        message_id: normalizedMessage.id,
        matched: true,
        action_taken: rule.action_type,
        result: 'failed',
        error: error.message,
      });
      return;
    }
  }
}

async function syncInboundMessagesFromGateway() {
  try {
    const upstream = await smsGateClient.listMessages({ page: 1, limit: 100 });
    const items = Array.isArray(upstream.items) ? upstream.items : [];

    for (const item of items) {
      const id = item.id;
      const isInbound = (item.direction || '').toLowerCase() === 'inbound' || (item.state || '').toLowerCase() === 'received';
      const phone = item.phone || item.phoneNumber || item.recipients?.[0]?.phoneNumber;
      const body = item.body || item.message || item.textMessage?.text;

      if (!id || !isInbound || !phone || !body) {
        continue;
      }

      const exists = messagesRepository.getMessageById(id);
      if (exists) {
        continue;
      }

      messagesRepository.insertMessage({
        id,
        direction: 'inbound',
        phone,
        body,
        status: 'received',
        tags: [],
        extracted: null,
      });
    }
  } catch {
    // Keep automation loop resilient when upstream is temporarily unavailable.
  }
}

async function processPendingInboundMessages() {
  const messages = automationRepository.listUnprocessedInboundMessages(100);
  for (const message of messages) {
    if (automationRepository.hasMessageBeenProcessed(message.id)) {
      continue;
    }

    await processInboundMessage(message);
  }
}

async function runAutomationCycle() {
  if (automationCycleRunning) {
    return { skipped: true };
  }

  automationCycleRunning = true;

  try {
    await syncInboundMessagesFromGateway();
    await processPendingInboundMessages();
    return { skipped: false };
  } finally {
    automationCycleRunning = false;
  }
}

function startAutomationEngine() {
  cron.schedule('*/10 * * * * *', () => {
    runAutomationCycle().catch(() => undefined);
  });
}

module.exports = {
  isRuleMatch,
  dispatchRegisteredWebhooks,
  runAutomationCycle,
  startAutomationEngine,
};
