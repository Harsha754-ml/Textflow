import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

let authToken = null;
let unauthorizedHandler = null;

client.interceptors.request.use((request) => {
  if (authToken) {
    request.headers.Authorization = `Bearer ${authToken}`;
  }

  return request;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof unauthorizedHandler === 'function') {
      unauthorizedHandler();
    }

    return Promise.reject(error);
  },
);

export function setAuthToken(token) {
  authToken = token || null;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function login(username, password) {
  const response = await client.post('/auth/login', { username, password });
  return response.data;
}

export async function getMe() {
  const response = await client.get('/auth/me');
  return response.data;
}

export async function bootstrapAdmin(payload) {
  const response = await client.post('/auth/bootstrap', payload);
  return response.data;
}

export async function getStatus() {
  const response = await client.get('/status');
  return response.data;
}

export async function getMessages(params = {}) {
  const response = await client.get('/messages', { params });
  return response.data;
}

export async function getMessage(id) {
  const response = await client.get(`/messages/${id}`);
  return response.data;
}

export async function deleteMessage(id) {
  const response = await client.delete(`/messages/${id}`);
  return response.data;
}

export async function getQueue() {
  const response = await client.get('/queue');
  return response.data;
}

export async function retryQueueItem(id) {
  const response = await client.post(`/queue/${id}/retry`);
  return response.data;
}

export async function sendSms(payload) {
  const response = await client.post('/send-sms', payload);
  return response.data;
}

export async function exportMessages() {
  const response = await client.get('/messages/export', { responseType: 'blob' });
  return response.data;
}

export async function getConversation(phone) {
  const response = await client.get(`/conversations/${encodeURIComponent(phone)}`);
  return response.data;
}

export async function getContacts(params = {}) {
  const response = await client.get('/contacts', { params });
  return response.data;
}

export async function createContact(payload) {
  const response = await client.post('/contacts', payload);
  return response.data;
}

export async function updateContact(id, payload) {
  const response = await client.put(`/contacts/${id}`, payload);
  return response.data;
}

export async function deleteContact(id) {
  const response = await client.delete(`/contacts/${id}`);
  return response.data;
}

export async function getContactGroups() {
  const response = await client.get('/contacts/groups');
  return response.data;
}

export async function getAutomationRules() {
  const response = await client.get('/automation/rules');
  return response.data;
}

export async function createAutomationRule(payload) {
  const response = await client.post('/automation/rules', payload);
  return response.data;
}

export async function updateAutomationRule(id, payload) {
  const response = await client.put(`/automation/rules/${id}`, payload);
  return response.data;
}

export async function toggleAutomationRule(id) {
  const response = await client.patch(`/automation/rules/${id}/toggle`);
  return response.data;
}

export async function deleteAutomationRule(id) {
  const response = await client.delete(`/automation/rules/${id}`);
  return response.data;
}

export async function testAutomationRule(id, sampleMessage) {
  const response = await client.post(`/automation/rules/${id}/test`, { sampleMessage });
  return response.data;
}

export async function getAutomationLogs(params = {}) {
  const response = await client.get('/automation/logs', { params });
  return response.data;
}

export async function runAutomationCycle() {
  const response = await client.post('/automation/run-cycle');
  return response.data;
}

export async function getAnalyticsSummary(params = {}) {
  const response = await client.get('/analytics/summary', { params });
  return response.data;
}

export async function getAnalyticsVolume(params = {}) {
  const response = await client.get('/analytics/volume', { params });
  return response.data;
}

export async function getAnalyticsDeliveryRate(params = {}) {
  const response = await client.get('/analytics/delivery-rate', { params });
  return response.data;
}

export async function getAnalyticsTopContacts(params = {}) {
  const response = await client.get('/analytics/top-contacts', { params });
  return response.data;
}

export async function getUsers() {
  const response = await client.get('/users');
  return response.data;
}

export async function createUser(payload) {
  const response = await client.post('/users', payload);
  return response.data;
}

export async function deleteUser(id) {
  const response = await client.delete(`/users/${id}`);
  return response.data;
}

export async function getWebhooks() {
  const response = await client.get('/webhooks');
  return response.data;
}

export async function createWebhook(payload) {
  const response = await client.post('/webhooks', payload);
  return response.data;
}

export async function updateWebhook(id, payload) {
  const response = await client.put(`/webhooks/${id}`, payload);
  return response.data;
}

export async function deleteWebhook(id) {
  const response = await client.delete(`/webhooks/${id}`);
  return response.data;
}

export async function testWebhook(id) {
  const response = await client.post(`/webhooks/${id}/test`);
  return response.data;
}

export async function getAnalyticsHeatmap(params = {}) {
  const response = await client.get('/analytics/heatmap', { params });
  return response.data;
}

export async function getAnalyticsResponseTime(params = {}) {
  const response = await client.get('/analytics/response-time', { params });
  return response.data;
}
