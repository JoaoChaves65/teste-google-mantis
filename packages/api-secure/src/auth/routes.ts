import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { createTokenService, createPasswordHasher } from '@barberlab/core/shared';
import { PgUserRepository, PgRefreshTokenRepository } from '@barberlab/core/infrastructure';
import {
  LoginCommand,
  RefreshTokenCommand,
  LogoutCommand,
  GetCurrentUserQuery,
} from '@barberlab/core/application';
import { authMiddleware } from '../http/middleware/auth';
import type { AuthenticatedRequest } from '../http/middleware/auth';
import rateLimit from 'express-rate-limit';
import { getEnv } from '../config/env';

const router = Router();

const loginSchema = z.object({
  email: z
    .string()
    .transform(val => val.trim().toLowerCase())
    .refine(val => z.string().email().safeParse(val).success, { message: 'Invalid email' }),
  password: z.string().min(8),
});

const env = getEnv();
const isDevOrTest = env.NODE_ENV !== 'production';

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 1000 : 20,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const createDependencies = () => {
  const executor = createSqlExecutor();
  const users = new PgUserRepository(executor);
  const refreshTokens = new PgRefreshTokenRepository(executor);
  const passwordHasher = createPasswordHasher();
  const tokenService = createTokenService();

  return { users, refreshTokens, passwordHasher, tokenService, sqlExecutor: executor };
};

const REFRESH_COOKIE_NAME = 'refresh_token';
const getCookieOpts = () => {
  const { COOKIE_SECURE } = getEnv();
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: isProd ? ('strict' as const) : ('lax' as const),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/auth',
  };
};

router.post('/login', authRateLimit, async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const { users, refreshTokens, passwordHasher, tokenService } = createDependencies();
  const loginCommand = new LoginCommand(users, refreshTokens, passwordHasher, tokenService);

  try {
    const result = await loginCommand.execute(parseResult.data);
    res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOpts());
    res.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      accessToken: result.tokens.accessToken,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidCredentialsError') {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    throw error;
  }
});

router.post('/refresh', authRateLimit, async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    res.status(401).json({ error: 'Missing refresh token cookie' });
    return;
  }

  const { users, refreshTokens, tokenService, sqlExecutor } = createDependencies();
  const refreshCommand = new RefreshTokenCommand(users, refreshTokens, tokenService, sqlExecutor);

  try {
    const result = await refreshCommand.execute({ refreshToken });
    res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOpts());
    res.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      accessToken: result.tokens.accessToken,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt.toISOString(),
    });
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOpts(), maxAge: 0 });
    if (error instanceof Error && error.name === 'TokenInvalidError') {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    if (error instanceof Error && error.name === 'TokenRevokedError') {
      res.status(401).json({ error: 'Refresh token revoked' });
      return;
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }
    if (error instanceof Error && error.name === 'AccountInactiveError') {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }
    throw error;
  }
});

router.get('/refresh', authRateLimit, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    res.status(401).json({ error: 'Missing refresh token cookie' });
    return;
  }

  const { users, refreshTokens, tokenService, sqlExecutor } = createDependencies();
  const refreshCommand = new RefreshTokenCommand(users, refreshTokens, tokenService, sqlExecutor);

  try {
    const result = await refreshCommand.execute({ refreshToken });
    res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOpts());
    res.json({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      accessToken: result.tokens.accessToken,
      accessTokenExpiresAt: result.tokens.accessTokenExpiresAt.toISOString(),
    });
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOpts(), maxAge: 0 });
    if (error instanceof Error && error.name === 'TokenInvalidError') {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    if (error instanceof Error && error.name === 'TokenRevokedError') {
      res.status(401).json({ error: 'Refresh token revoked' });
      return;
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }
    if (error instanceof Error && error.name === 'AccountInactiveError') {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }
    throw error;
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    res.status(204).send();
    return;
  }

  const { refreshTokens, tokenService } = createDependencies();
  const logoutCommand = new LogoutCommand(refreshTokens, tokenService);

  try {
    await logoutCommand.execute({ refreshToken });
    res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOpts(), maxAge: 0 });
    res.status(204).send();
  } catch (error) {
    res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieOpts(), maxAge: 0 });
    if (error instanceof Error && error.name === 'TokenInvalidError') {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    if (error instanceof Error && error.name === 'TokenRevokedError') {
      res.status(401).json({ error: 'Refresh token already revoked' });
      return;
    }
    throw error;
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const { users } = createDependencies();
  const getCurrentUserQuery = new GetCurrentUserQuery(users);

  try {
    const user = await getCurrentUserQuery.execute({ userId: req.user!.sub });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'EntityNotFoundError') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (error instanceof Error && error.name === 'AccountInactiveError') {
      res.status(403).json({ error: 'Account is inactive' });
      return;
    }
    throw error;
  }
});

export const authRouter = router;
