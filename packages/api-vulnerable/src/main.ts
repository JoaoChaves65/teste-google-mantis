import { createApp } from './http/app';
import { getEnv } from './config/env';

// eslint-disable-next-line no-console
const logger = {
  info: (message: string) => console.log(message),
  error: (message: string, error?: Error) => console.error(message, error ?? ''),
};

const startServer = async (): Promise<void> => {
  const env = getEnv();
  const app = createApp();

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`[api-vulnerable] Server running on http://${env.HOST}:${env.PORT}`);
    logger.info(`[api-vulnerable] Environment: ${env.NODE_ENV}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[api-vulnerable] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      logger.info('[api-vulnerable] Server closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('[api-vulnerable] Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch(error => {
  logger.error('[api-vulnerable] Failed to start server:', error);
  process.exit(1);
});
