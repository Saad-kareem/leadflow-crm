import { Router } from 'express';
import { getSummary } from '../controllers/stats.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const statsRouter = Router();

statsRouter.get('/summary', requireAuth, getSummary);
