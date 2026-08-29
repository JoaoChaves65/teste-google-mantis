export { createApp } from './http/app';
export { authRouter } from './auth/routes';
export { v1Router } from './api/v1';
export { VulnerableAppointmentRepository } from '@barberlab/core';
export { vulnerableErrorHandler } from './http/middleware/vulnerableErrorHandler';
export { vulnerableAuthMiddleware } from './http/middleware/vulnerableAuth';
export { vulnerableRequireRole } from './http/middleware/vulnerableRbac';
export type { AuthenticatedRequest } from './http/middleware/vulnerableAuth';
export type { VulnerableAuthenticatedRequest } from './http/middleware/vulnerableRbac';
