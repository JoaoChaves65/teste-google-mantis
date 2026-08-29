import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode } from '@barberlab/core';

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(ErrorCode.NOT_FOUND, 'Route not found'));
};
