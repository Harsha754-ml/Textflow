const cron = require('node-cron');
const { randomUUID } = require('crypto');
const smsGateClient = require('./smsGateClient');

const scheduledQueue = [];
const messageHistory = [];

const BACKOFF_MINUTES = [1, 5, 15];

function cloneQueueItem(item) {
  return {
    ...item,
    phoneNumbers: [...item.phoneNumbers],
  };
}

function cloneMessage(item) {
  return {
    ...item,
    phoneNumbers: [...item.phoneNumbers],
  };
}

function createMessageRecord(payload, status, responseData = null, errorMessage = null) {
  return {
    id: randomUUID(),
    phoneNumbers: [...payload.phoneNumbers],
    message: payload.message,
    scheduledAt: payload.scheduledAt || null,
    status,
    responseData,
    attempts: payload.attempts || 0,
    lastError: errorMessage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function sendImmediately(payload, options = {}) {
  try {
    const responseData = await smsGateClient.sendMessage({
      phoneNumbers: payload.phoneNumbers,
      message: payload.message,
    });

    const record = createMessageRecord(payload, 'sent', responseData);

    if (options.recordHistory !== false) {
      messageHistory.unshift(record);
    }

    return { record, responseData };
  } catch (error) {
    const record = createMessageRecord(payload, 'failed', null, error.message);

    if (options.recordHistory !== false) {
      messageHistory.unshift(record);
    }

    throw error;
  }
}

function scheduleMessage(payload) {
  const queueItem = {
    id: randomUUID(),
    phoneNumbers: [...payload.phoneNumbers],
    message: payload.message,
    scheduledAt: payload.scheduledAt,
    attempts: 0,
    status: 'pending',
    nextRetryAt: payload.scheduledAt,
    lastError: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  scheduledQueue.push(queueItem);
  scheduledQueue.sort((left, right) => new Date(left.nextRetryAt).getTime() - new Date(right.nextRetryAt).getTime());
  return queueItem;
}

async function processScheduledQueue(now = new Date()) {
  const dueItems = scheduledQueue.filter((item) => item.status !== 'completed' && new Date(item.nextRetryAt).getTime() <= now.getTime());

  for (const item of dueItems) {
    try {
      item.status = item.attempts > 0 ? 'retrying' : 'processing';
      item.updatedAt = new Date().toISOString();

      const { record } = await sendImmediately({
        phoneNumbers: item.phoneNumbers,
        message: item.message,
        scheduledAt: item.scheduledAt,
      }, { recordHistory: false });

      addHistoryRecord(record);

      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      item.messageId = record.id;
      item.updatedAt = item.completedAt;
      removeQueueItem(item.id);
    } catch (error) {
      item.attempts += 1;
      item.lastError = error.message;
      item.updatedAt = new Date().toISOString();

      if (item.attempts >= BACKOFF_MINUTES.length) {
        item.status = 'failed';
        item.failedAt = new Date().toISOString();
        addHistoryRecord(createMessageRecord({
          phoneNumbers: item.phoneNumbers,
          message: item.message,
          scheduledAt: item.scheduledAt,
        }, 'failed', null, item.lastError));
        continue;
      }

      const minutes = BACKOFF_MINUTES[item.attempts - 1];
      item.status = 'retrying';
      item.nextRetryAt = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
    }
  }
}

function removeQueueItem(id) {
  const index = scheduledQueue.findIndex((item) => item.id === id);
  if (index >= 0) {
    scheduledQueue.splice(index, 1);
  }
}

function retryQueueItem(id) {
  const item = scheduledQueue.find((queueItem) => queueItem.id === id);
  if (!item) {
    return null;
  }

  item.status = 'pending';
  item.nextRetryAt = new Date().toISOString();
  item.updatedAt = new Date().toISOString();
  return item;
}

function getQueueState() {
  return scheduledQueue.map(cloneQueueItem);
}

function getHistory() {
  return messageHistory.map(cloneMessage);
}

function addHistoryRecord(record) {
  messageHistory.unshift(record);
}

function findHistoryRecord(id) {
  return messageHistory.find((item) => item.id === id) || null;
}

function deleteHistoryRecord(id) {
  const index = messageHistory.findIndex((item) => item.id === id);
  if (index >= 0) {
    messageHistory.splice(index, 1);
    return true;
  }

  return false;
}

cron.schedule('* * * * *', () => {
  processScheduledQueue().catch(() => undefined);
});

module.exports = {
  sendImmediately,
  scheduleMessage,
  processScheduledQueue,
  retryQueueItem,
  getQueueState,
  getHistory,
  addHistoryRecord,
  findHistoryRecord,
  deleteHistoryRecord,
};
