import { Router } from 'express';
import {
  addNote,
  createLead,
  deleteLead,
  getLead,
  listLeads,
  updateLead,
} from '../controllers/leads.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createLeadSchema,
  listLeadsSchema,
  noteSchema,
  objectIdSchema,
  updateLeadSchema,
} from '../validation/schemas.js';

export const leadsRouter = Router();

// Applied to the router rather than to each route, so a new endpoint added
// below is private by default. Forgetting a guard should be impossible.
leadsRouter.use(requireAuth);

leadsRouter
  .route('/')
  .get(validate(listLeadsSchema, 'query'), listLeads)
  .post(validate(createLeadSchema), createLead);

leadsRouter
  .route('/:id')
  .all(validate(objectIdSchema, 'params'))
  .get(getLead)
  .patch(validate(updateLeadSchema), updateLead)
  .delete(deleteLead);

leadsRouter.post(
  '/:id/notes',
  validate(objectIdSchema, 'params'),
  validate(noteSchema),
  addNote,
);
