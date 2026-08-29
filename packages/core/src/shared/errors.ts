export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;

    switch (code) {
      case ErrorCode.VALIDATION_ERROR:
        this.statusCode = 400;
        break;
      case ErrorCode.NOT_FOUND:
        this.statusCode = 404;
        break;
      case ErrorCode.UNAUTHORIZED:
        this.statusCode = 401;
        break;
      case ErrorCode.FORBIDDEN:
        this.statusCode = 403;
        break;
      case ErrorCode.CONFLICT:
        this.statusCode = 409;
        break;
      case ErrorCode.DATABASE_ERROR:
        this.statusCode = 500;
        break;
      default:
        this.statusCode = 500;
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static notFound(resource: string, id?: string): AppError {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    return new AppError(ErrorCode.NOT_FOUND, message, { resource, id });
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(ErrorCode.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): AppError {
    return new AppError(ErrorCode.FORBIDDEN, message);
  }

  static conflict(message: string, details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.CONFLICT, message, details);
  }

  static internal(message = 'Internal server error', details?: Record<string, unknown>): AppError {
    return new AppError(ErrorCode.INTERNAL_ERROR, message, details);
  }
}

// Re-export domain errors
export {
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
} from '../domain/errors';
