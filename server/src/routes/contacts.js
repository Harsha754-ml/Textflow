const express = require('express');
const { z } = require('zod');
const { requireAdmin } = require('../middleware/auth');
const contactsRepository = require('../repositories/contactsRepository');

const router = express.Router();

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  group_name: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/contacts', (request, response, next) => {
  try {
    const items = contactsRepository.listContacts({
      group: request.query.group,
      search: request.query.search,
    });

    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

router.post('/contacts', requireAdmin, (request, response, next) => {
  try {
    const parsed = contactSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid contact payload',
        status: 400,
      });
    }

    const contact = contactsRepository.createContact(parsed.data);
    return response.status(201).json(contact);
  } catch (error) {
    return next(error);
  }
});

router.put('/contacts/:id', requireAdmin, (request, response, next) => {
  try {
    const parsed = contactSchema.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid contact payload',
        status: 400,
      });
    }

    const updated = contactsRepository.updateContact(Number(request.params.id), parsed.data);

    if (!updated) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Contact not found',
        status: 404,
      });
    }

    return response.json(updated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/contacts/:id', requireAdmin, (request, response, next) => {
  try {
    const deleted = contactsRepository.deleteContact(Number(request.params.id));
    if (!deleted) {
      return response.status(404).json({
        error: 'NOT_FOUND',
        message: 'Contact not found',
        status: 404,
      });
    }

    return response.json({ deleted: true });
  } catch (error) {
    return next(error);
  }
});

router.get('/contacts/groups', (request, response, next) => {
  try {
    const items = contactsRepository.listGroups();
    return response.json({ items });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
