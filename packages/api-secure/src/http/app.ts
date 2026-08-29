import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { getEnv } from '../config/env';
import { healthRouter } from '../health/routes';
import { authRouter } from '../auth/routes';
import { v1Router } from '../api/v1';
import { errorHandler } from './middleware/errorHandler';
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
