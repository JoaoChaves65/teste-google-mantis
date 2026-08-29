import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getEnv } from '../config/env';
import { healthRouter } from '../health/routes';
import { authRouter } from '../auth/routes';
import { v1Router } from '../api/v1';
import { vulnerableErrorHandler } from './middleware/vulnerableErrorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

export const createApp = (): Application => {
  const env = getEnv();
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/api/v1', v1Router);

  // TEST ENDPOINT: Forces a 500 error for security lab testing
  if (process.env.NODE_ENV === 'test') {
    app.get('/api/v1/__trigger_500__', (_req, _res) => {
      throw new Error('Intentional 500 error for security lab testing');
    });
  }

  app.use(notFoundHandler);
  app.use(vulnerableErrorHandler);

  return app;
};
