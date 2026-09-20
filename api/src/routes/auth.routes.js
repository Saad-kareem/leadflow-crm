import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validation/schemas.js';
import { requireAuth } from '../middleware/auth.js';

/**
 * Login is the one unauthenticated endpoint that can be brute-forced, so it
 * gets a tighter limit than the rest of the API. Successful sign-ins are not
 * counted, so a team on one office IP cannot lock themselves out by working.
 */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Please try again in a few minutes.' },
});

export const authRouter = Router();

authRouter.post('/login', loginLimiter, validate(loginSchema), login);
authRouter.get('/me', requireAuth, me);
