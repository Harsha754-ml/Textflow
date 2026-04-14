const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDatabase } = require('../db');

function extractBearerToken(headerValue = '') {
  const [scheme, token] = headerValue.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function authenticateJWT(request, response, next) {
  const token = extractBearerToken(request.headers.authorization);

  if (!token) {
    return response.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Missing bearer token',
      status: 401,
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const db = getDatabase();
    const user = db
      .prepare('SELECT id, username, role FROM users WHERE id = ?')
      .get(payload.sub);

    if (!user) {
      return response.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not found',
        status: 401,
      });
    }

    request.user = user;
    return next();
  } catch (error) {
    return response.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
      status: 401,
    });
  }
}

function requireAdmin(request, response, next) {
  if (!request.user || request.user.role !== 'admin') {
    return response.status(403).json({
      error: 'FORBIDDEN',
      message: 'Admin role is required for this action',
      status: 403,
    });
  }

  return next();
}

module.exports = {
  authenticateJWT,
  requireAdmin,
};
