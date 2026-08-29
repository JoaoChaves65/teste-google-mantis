import type { Request, Response, NextFunction } from 'express';
import { createTokenService } from '@barberlab/core/shared';

export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = createTokenService().verifyAccessToken(token);

  if (!payload) {
    const decoded = createTokenService().decodeToken(token);
    if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
      res.status(401).json({ error: 'Access token has expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid access token' });
    return;
  }

  if (payload.type !== 'access') {
    res.status(401).json({ error: 'Token is not an access token' });
    return;
  }

  req.user = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};
