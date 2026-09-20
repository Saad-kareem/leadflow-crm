import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ping, receiveWordPressLead } from '../controllers/integration.controller.js';
import { requireSyncToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { wordpressLeadSchema } from '../validation/schemas.js';

/**
 * A public contact form is the obvious place for a flood of junk. The plugin
 * itself rate-limits per visitor; this is the backstop for the API, generous
 * enough that a busy site's genuine traffic never hits it.
 */
const intakeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please slow down.' },
});

export const integrationRouter = Router();

integrationRouter.use(requireSyncToken);

integrationRouter.get('/ping', ping);
integrationRouter.post('/leads', intakeLimiter, validate(wordpressLeadSchema), receiveWordPressLead);
