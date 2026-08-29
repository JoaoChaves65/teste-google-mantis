export { version } from './version';

export type { Result, Ok, Err } from './shared/result';
export type { PaginatedResponse, PaginationParams } from './shared/pagination';
export { UserRole, UserStatus, createUser, updateUser } from './domain/user';
export { AppointmentStatus } from './domain/appointment';
export { TransactionType } from './domain/transaction';
export { Money } from './domain/money';
export { VulnerableAppointmentRepository } from './infrastructure/database/repositories/vulnerable-repository';

export {
  AppError,
  ErrorCode,
  DomainError,
  InvalidDomainError,
  InvalidStatusTransitionError,
  InactiveBarberError,
  InactiveServiceError,
  InvalidTransactionTypeError,
  EntityNotFoundError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenRevokedError,
  TokenInvalidError,
  InsufficientPermissionsError,
  AccountInactiveError,
} from './shared/errors';
export { setupTestDatabase } from './infrastructure/database/tests/setup';

export * as Domain from './domain';
export * as Application from './application';
export * as Persistence from './persistence';
export * as Shared from './shared';
export * as Infrastructure from './infrastructure';
