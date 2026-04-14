import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { deleteMessage, exportMessages, getMessage, getMessages, getQueue, getStatus, retryQueueItem, sendSms } from '../api/client';
import { useAdaptivePolling } from '../hooks/useAdaptivePolling';

const AppDataContext = createContext(null);

function readBlobAsDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function AppDataProvider({ children }) {
  const [status, setStatus] = useState({ reachable: false, latencyMs: null, status: null });
  const [messages, setMessages] = useState([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [queue, setQueue] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loadingMessageId, setLoadingMessageId] = useState(null);

  const refreshAll = useCallback(async () => {
    const [statusData, messageData, queueData] = await Promise.allSettled([getStatus(), getMessages({ page: 1, limit: 50 }), getQueue()]);

    let failed = false;

    if (statusData.status === 'fulfilled') {
      setStatus(statusData.value);
    } else {
      failed = true;
    }

    if (messageData.status === 'fulfilled') {
      const payload = messageData.value;
      const items = payload.items || payload.messages || [];
      setMessages(items);
      setMessageTotal(payload.total ?? items.length);
    } else {
      failed = true;
    }

    if (queueData.status === 'fulfilled') {
      setQueue(queueData.value.items || []);
    } else {
      failed = true;
    }

    if (failed) {
      throw new Error('One or more dashboard requests failed');
    }

    return true;
  }, []);

  useAdaptivePolling(refreshAll, {
    dependencies: [],
    baseDelayMs: 5000,
    backoffDelayMs: 30000,
    failureThreshold: 3,
  });

  useEffect(() => {
    void refreshAll().catch(() => undefined);
  }, []);

  const actions = useMemo(() => ({
    async refreshMessages() {
      const payload = await getMessages({ page: 1, limit: 50 });
      const items = payload.items || payload.messages || [];
      setMessages(items);
      setMessageTotal(payload.total ?? items.length);
    },
    async refreshQueue() {
      const payload = await getQueue();
      setQueue(payload.items || []);
    },
    async refreshStatus() {
      const payload = await getStatus();
      setStatus(payload);
    },
    async sendMessage(payload) {
      const result = await sendSms(payload);
      toast.success(result.queued ? 'Message queued' : 'Message sent');
      await refreshAll();
      return result;
    },
    async removeMessage(id) {
      await deleteMessage(id);
      toast.success('Message deleted');
      await refreshAll();
    },
    async loadMessage(id) {
      setLoadingMessageId(id);
      try {
        const payload = await getMessage(id);
        setSelectedMessage(payload);
      } finally {
        setLoadingMessageId(null);
      }
    },
    closeMessage() {
      setSelectedMessage(null);
    },
    async retryQueue(id) {
      await retryQueueItem(id);
      toast.success('Retry scheduled');
      await refreshAll();
    },
    async exportHistory() {
      const blob = await exportMessages();
      readBlobAsDownload(blob, 'messages.csv');
    },
  }), [refreshAll]);

  const value = useMemo(() => ({
    status,
    messages,
    messageTotal,
    queue,
    selectedMessage,
    loadingMessageId,
    ...actions,
  }), [status, messages, messageTotal, queue, selectedMessage, loadingMessageId, actions]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
