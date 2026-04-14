const axios = require('axios');
const config = require('../config');

function createClient() {
  const headers = {};

  if (config.authType === 'basic' && config.smsUsername && config.smsPassword) {
    headers.Authorization = `Basic ${Buffer.from(`${config.smsUsername}:${config.smsPassword}`).toString('base64')}`;
  }

  return axios.create({
    baseURL: config.smsApiUrl,
    timeout: 10000,
    headers,
  });
}

const client = createClient();

async function proxyRequest(method, url, data, params) {
  try {
    const response = await client.request({ method, url, data, params });
    return response.data;
  } catch (error) {
    const status = error.response?.status || 502;
    const code = status >= 500 ? 'SMSGATE_UPSTREAM_ERROR' : 'SMSGATE_REQUEST_ERROR';
    const message = error.response?.data?.message || error.message || 'SMSGate request failed';
    const upstreamError = new Error(message);
    upstreamError.status = status;
    upstreamError.code = code;
    upstreamError.upstreamData = error.response?.data;
    throw upstreamError;
  }
}

async function sendMessage(payload) {
  const body = {
    phoneNumbers: payload.phoneNumbers,
    textMessage: {
      text: payload.message,
    },
  };

  return proxyRequest('post', '/messages', body);
}

async function listMessages(params) {
  return proxyRequest('get', '/messages', undefined, params);
}

async function getMessage(id) {
  return proxyRequest('get', `/messages/${id}`);
}

async function deleteMessage(id) {
  return proxyRequest('delete', `/messages/${id}`);
}

async function probeReachability() {
  const startedAt = Date.now();

  try {
    const response = await client.get('/');
    return {
      reachable: true,
      latencyMs: Date.now() - startedAt,
      status: response.status,
    };
  } catch (error) {
    if (error.response) {
      return {
        reachable: true,
        latencyMs: Date.now() - startedAt,
        status: error.response.status,
      };
    }

    return {
      reachable: false,
      latencyMs: Date.now() - startedAt,
      status: null,
    };
  }
}

module.exports = {
  sendMessage,
  listMessages,
  getMessage,
  deleteMessage,
  probeReachability,
};
