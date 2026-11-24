import http from 'node:http';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initSocketServer } from './sockets/index.js';

const host = process.env.HOST || (env.isProduction ? '0.0.0.0' : '127.0.0.1');

async function start() {
  await connectDatabase();
  const server = http.createServer(app);
  initSocketServer(server);

  server.listen(env.port, host, () => {
    console.log(`[api] listening on http://${host}:${env.port} (${env.nodeEnv})`);
    console.log(`[api] Swagger UI: http://${host}:${env.port}/api-docs`);
  });

  const shutdown = async (signal) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[api] failed to start:', error.message);
  process.exit(1);
});
