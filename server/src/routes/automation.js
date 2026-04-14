const express = require('express');
const { z } = require('zod');
const { requireAdmin } = require('../middleware/auth');
const automationRepository = require('../repositories/automationRepository');
const { isRuleMatch, runAutomationCycle } = require('../services/automationService');

const router = express.Router();

const ruleSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().optional().default(true),
  trigger_type: z.enum(['keyword', 'regex', 'any']),
  trigger_value: z.string().optional().default(''),
  action_type: z.enum(['auto_reply', 'webhook', 'tag', 'extract']),
  action_config: z.record(z.any()).optional().default({}),
  priority: z.number().int().optional().default(0),
});

router.get('/automation/rules', (request, response, next) => {
  try {
    const items = automationRepository.listRules();
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/automation/rules', requireAdmin, (request, response, next) => {
  try {
    const parsed = ruleSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid automation rule payload',
        status: 400,
      });
    }

    const item = automationRepository.createRule(parsed.data);
    return response.status(201).json(item);
  } catch (error) {
    return next(error);
  }
});

router.put('/automation/rules/:id', requireAdmin, (request, response, next) => {
  try {
    const parsed = ruleSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid automation rule payload',
        status: 400,
      });
    }

    const item = automationRepository.updateRule(Number(request.params.id), parsed.data);
    if (!item) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Rule not found',
        status: 404,
      });
    }

    return response.json(item);
  } catch (error) {
    return next(error);
  }
});

router.patch('/automation/rules/:id/toggle', requireAdmin, (request, response, next) => {
  try {
    const item = automationRepository.toggleRule(Number(request.params.id));
    if (!item) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Rule not found',
        status: 404,
      });
    }

    return response.json(item);
  } catch (error) {
    return next(error);
  }
});

router.delete('/automation/rules/:id', requireAdmin, (request, response, next) => {
  try {
    const deleted = automationRepository.deleteRule(Number(request.params.id));
    if (!deleted) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Rule not found',
        status: 404,
      });
    }

    return response.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.post('/automation/rules/:id/test', requireAdmin, (request, response, next) => {
  try {
    const rule = automationRepository.getRuleById(Number(request.params.id));
    if (!rule) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Rule not found',
        status: 404,
      });
    }

    const sampleMessage = String(request.body?.sampleMessage || '');
    const matched = isRuleMatch(rule, sampleMessage);

    return response.json({
      ruleId: rule.id,
      matched,
      action_type: rule.action_type,
      action_config: rule.action_config,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/automation/logs', (request, response, next) => {
  try {
    const page = Math.max(Number(request.query.page || 1), 1);
    const limit = Math.max(Number(request.query.limit || 25), 1);
    const ruleId = request.query.ruleId ? Number(request.query.ruleId) : undefined;

    const result = automationRepository.listLogs({ ruleId, page, limit });
    return response.json(result);
  } catch (error) {
    return next(error);
  }
});

router.post('/automation/run-cycle', requireAdmin, async (request, response, next) => {
  try {
    await runAutomationCycle();
    return response.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
