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
  smsUsername: process.env.SMS_USERNAME || process.env.USERNAME || '',
  smsPassword: process.env.SMS_PASSWORD || process.env.PASSWORD || '',
  rateLimitRpm: toNumber(process.env.RATE_LIMIT_RPM, 60),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  dbPath: process.env.DB_PATH || './data/sms.db',
  bootstrapAdminUsername: process.env.BOOTSTRAP_ADMIN_USERNAME || '',
  bootstrapAdminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || '',
};
