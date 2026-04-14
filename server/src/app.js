const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const config = require('./config');
const { authenticateJWT } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errors');
const authRouter = require('./routes/auth');
const messagesRouter = require('./routes/messages');
const contactsRouter = require('./routes/contacts');
const usersRouter = require('./routes/users');
const systemRouter = require('./routes/system');
const automationRouter = require('./routes/automation');
const analyticsRouter = require('./routes/analytics');
const webhooksRouter = require('./routes/webhooks');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: config.rateLimitRpm,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use('/api/auth', authRouter);
app.use('/api', authenticateJWT);
app.use('/api', messagesRouter);
app.use('/api', contactsRouter);
app.use('/api', usersRouter);
app.use('/api', systemRouter);
app.use('/api', automationRouter);
app.use('/api', analyticsRouter);
app.use('/api', webhooksRouter);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
