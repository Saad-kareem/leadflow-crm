import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';

const start = async () => {
  await connectDatabase();
  console.log('[api] connected to MongoDB');

  const server = createApp().listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  /** Finish in-flight requests before closing the database connection. */
  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // If a connection refuses to drain, do not hang a container forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

start().catch((error) => {
  console.error('[api] failed to start:', error.message);
  process.exit(1);
});
