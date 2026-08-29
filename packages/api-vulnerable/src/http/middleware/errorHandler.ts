import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '@barberlab/core';

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

  console.error('Unhandled error:', err);

  res.status(500).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    },
  });
};
