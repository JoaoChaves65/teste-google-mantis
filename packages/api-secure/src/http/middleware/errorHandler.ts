import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, Domain } from '@barberlab/core';

const { DomainError } = Domain;

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  if (err instanceof DomainError) {
    let statusCode = 500;
    let code = ErrorCode.INTERNAL_ERROR;

    switch (err.code) {
      case 'NOT_FOUND':
        statusCode = 404;
        code = ErrorCode.NOT_FOUND;
        break;
      case 'INVALID_STATUS_TRANSITION':
        statusCode = 409;
        code = ErrorCode.CONFLICT;
        break;
      case 'INVALID_DOMAIN':
        statusCode = 400;
        code = ErrorCode.VALIDATION_ERROR;
        break;
      case 'INACTIVE_BARBER':
      case 'INACTIVE_SERVICE':
        statusCode = 400;
        code = ErrorCode.VALIDATION_ERROR;
        break;
      case 'INVALID_TRANSACTION_TYPE':
        statusCode = 400;
        code = ErrorCode.VALIDATION_ERROR;
        break;
      case 'INVALID_CREDENTIALS':
        statusCode = 401;
        code = ErrorCode.UNAUTHORIZED;
        break;
      case 'TOKEN_EXPIRED':
      case 'TOKEN_REVOKED':
      case 'TOKEN_INVALID':
        statusCode = 401;
        code = ErrorCode.UNAUTHORIZED;
        break;
      case 'INSUFFICIENT_PERMISSIONS':
        statusCode = 403;
        code = ErrorCode.FORBIDDEN;
        break;
      case 'ACCOUNT_INACTIVE':
        statusCode = 401;
        code = ErrorCode.UNAUTHORIZED;
        break;
      default:
        statusCode = 500;
        code = ErrorCode.INTERNAL_ERROR;
    }

    res.status(statusCode).json({
      error: {
        code,
        message: err.message,
      },
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    },
  });
};
