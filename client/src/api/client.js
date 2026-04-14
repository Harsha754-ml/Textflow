import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

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
