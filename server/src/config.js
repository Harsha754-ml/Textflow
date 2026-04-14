const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), override: true });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: toNumber(process.env.PORT, 5000),
  smsApiUrl: process.env.SMS_API_URL || 'http://10.165.0.51:8080',
  authType: (process.env.AUTH_TYPE || 'basic').toLowerCase(),
  username: process.env.USERNAME || '',
  password: process.env.PASSWORD || '',
  rateLimitRpm: toNumber(process.env.RATE_LIMIT_RPM, 60),
};
