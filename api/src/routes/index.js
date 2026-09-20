import { Router } from 'express';
import mongoose from 'mongoose';
import { authRouter } from './auth.routes.js';
import { leadsRouter } from './leads.routes.js';
import { statsRouter } from './stats.routes.js';
import { integrationRouter } from './integration.routes.js';
import {
  BUDGET_RANGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  SCORE_BANDS,
  SERVICES,
} from '../domain/constants.js';
import { describeDuplicateRule } from '../domain/duplicates.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({
    success: connected,
    data: { status: connected ? 'ok' : 'degraded', database: connected ? 'up' : 'down' },
  });
});

/**
 * The shared vocabulary, served to every client.
 *
 * The dashboard builds its selects and badges from this, so adding a service
 * is a one-line change here rather than a change in four codebases.
 */
apiRouter.get('/meta', (_req, res) => {
  res.json({
    success: true,
    data: {
      statuses: LEAD_STATUSES,
      sources: LEAD_SOURCES,
      services: SERVICES,
      budgets: BUDGET_RANGES,
      scoreBands: SCORE_BANDS,
      duplicateRule: describeDuplicateRule(),
    },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/leads', leadsRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/integrations/wordpress', integrationRouter);
