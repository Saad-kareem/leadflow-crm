import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { env, isProduction } from './config/env.js';

export const createApp = () => {
  const app = express();

  // Behind a reverse proxy in any real deployment; without this the rate
  // limiters would see every request as coming from the proxy's own address
  // and throttle the whole site as one client.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());

  app.use(
    cors({
      // An allow-list, not `*`. These endpoints carry a bearer token, and a
      // wildcard would let any site on the internet call them from a victim's
      // browser. Server-to-server callers (the WordPress plugin) send no
      // Origin header at all and are let through here — they are authenticated
      // by the shared secret instead.
      origin(origin, callback) {
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed`));
      },
      credentials: false,
    }),
  );

  // 100kb is far more than a contact form needs and small enough that a large
  // body cannot be used to tie up the process.
  app.use(express.json({ limit: '100kb' }));

  if (!isProduction) app.use(morgan('dev'));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
