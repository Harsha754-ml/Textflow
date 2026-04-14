const express = require('express');
const smsGateClient = require('../services/smsGateClient');
const queueService = require('../services/queueService');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/status', async (request, response, next) => {
  try {
    const status = await smsGateClient.probeReachability();
    return response.json(status);
  } catch (error) {
    return next(error);
  }
});

router.get('/queue', (request, response) => {
  response.json({ items: queueService.getQueueState() });
});

router.post('/queue/:id/retry', requireAdmin, (request, response) => {
  const item = queueService.retryQueueItem(request.params.id);
  if (!item) {
    return response.status(404).json({
      error: 'NOT_FOUND',
      message: 'Queue item not found',
      status: 404,
    });
  }

  return response.json({ item });
});

module.exports = router;
