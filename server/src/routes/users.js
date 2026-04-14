const express = require('express');
const { z } = require('zod');
const { requireAdmin } = require('../middleware/auth');
const usersRepository = require('../repositories/usersRepository');

const router = express.Router();

const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  role: z.enum(['admin', 'viewer']),
});

router.get('/users', requireAdmin, (request, response, next) => {
  try {
    const items = usersRepository.listUsers();
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/users', requireAdmin, (request, response, next) => {
  try {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid user payload',
        status: 400,
      });
    }

    const user = usersRepository.createUser(parsed.data);
    return response.status(201).json(user);
  } catch (error) {
    return next(error);
  }
});

router.delete('/users/:id', requireAdmin, (request, response, next) => {
  try {
    const deleted = usersRepository.deleteUser(Number(request.params.id));
    if (!deleted) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'User not found',
        status: 404,
      });
    }

    return response.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
