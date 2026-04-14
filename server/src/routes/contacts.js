const express = require('express');
const { z } = require('zod');
const { parse } = require('csv-parse/sync');
const { requireAdmin } = require('../middleware/auth');
const contactsRepository = require('../repositories/contactsRepository');
const auditLogsRepository = require('../repositories/auditLogsRepository');

const router = express.Router();

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  group_name: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dnc: z.boolean().optional(),
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
    auditLogsRepository.logAction({
      userId: request.user ? request.user.id : null,
      action: 'CONTACT_CREATED',
      targetType: 'contact',
      targetId: contact.id.toString(),
      details: { phone: contact.phone }
    });
    return response.status(201).json(contact);
  } catch (error) {
    return next(error);
  }
});

router.post('/contacts/import', requireAdmin, (request, response, next) => {
  try {
    const { csv } = request.body;
    if (!csv) return response.status(400).json({ error: 'MISSING_CSV' });

    const records = parse(csv, { columns: true, skip_empty_lines: true });
    let imported = 0;

    for (const record of records) {
      if (record.phone && record.name) {
        try {
          contactsRepository.createContact({
            name: record.name,
            phone: record.phone,
            group_name: record.group_name || null,
            notes: record.notes || null,
            tags: record.tags ? record.tags.split(',').map(s => s.trim()) : [],
            dnc: record.dnc === 'true' || record.dnc === '1'
          });
          imported++;
        } catch(e) {
          // Ignore duplicates or bad phones
        }
      }
    }
    
    auditLogsRepository.logAction({
      userId: request.user ? request.user.id : null,
      action: 'CONTACTS_IMPORTED',
      details: { count: imported }
    });

    return response.json({ imported });
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

    auditLogsRepository.logAction({
      userId: request.user ? request.user.id : null,
      action: 'CONTACT_UPDATED',
      targetType: 'contact',
      targetId: request.params.id,
    });

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

    auditLogsRepository.logAction({
      userId: request.user ? request.user.id : null,
      action: 'CONTACT_DELETED',
      targetType: 'contact',
      targetId: request.params.id,
    });

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
