const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const config = require('../config');
const { getDatabase } = require('../db');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const bootstrapSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

router.post('/bootstrap', (request, response) => {
  const parsed = bootstrapSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'username (min 3) and password (min 6) are required',
      status: 400,
    });
  }

  const db = getDatabase();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (countRow.count > 0) {
    return response.status(409).json({
      error: 'CONFLICT',
      message: 'Bootstrap is only allowed when no users exist',
      status: 409,
    });
  }

  const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
  const result = db
    .prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
    .run(parsed.data.username, passwordHash, 'admin');

  return response.status(201).json({
    id: result.lastInsertRowid,
    username: parsed.data.username,
    role: 'admin',
  });
});

router.post('/login', (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'username and password are required',
      status: 400,
    });
  }

  const db = getDatabase();
  const user = db
    .prepare('SELECT id, username, password, role FROM users WHERE username = ?')
    .get(parsed.data.username);

  if (!user || !bcrypt.compareSync(parsed.data.password, user.password)) {
    return response.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid credentials',
      status: 401,
    });
  }

  const token = jwt.sign(
    {
      username: user.username,
      role: user.role,
    },
    config.jwtSecret,
    {
      subject: String(user.id),
      expiresIn: '8h',
    },
  );

  return response.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

router.get('/me', authenticateJWT, (request, response) => {
  return response.json({ user: request.user });
});

module.exports = router;
