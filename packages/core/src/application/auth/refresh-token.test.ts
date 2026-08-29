import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RefreshTokenCommand } from './refresh-token';
import { sha256 } from '../../shared/auth';
import type { SqlExecutor } from '../../persistence/interfaces';

interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  createdAt: Date;
}

interface SqlExecutor {
  transaction: (fn: (executor: SqlExecutor) => Promise<unknown>) => Promise<unknown>;
  execute: (sql: string, params: unknown[]) => Promise<{ rowCount: number }>;
  query: (sql: string, params: unknown[]) => Promise<unknown[]>;
  queryOne: (sql: string, params: unknown[]) => Promise<unknown | null>;
}

describe('RefreshTokenCommand', () => {
  let refreshTokensMap: Map<string, RefreshTokenData>;

  beforeEach(() => {
    refreshTokensMap = new Map();

    const validRefreshToken = 'valid-refresh-token';
    const tokenHash = sha256(validRefreshToken);

    refreshTokensMap.set(tokenHash, {
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    });
  });

  const createDeps = (overrides: Record<string, unknown> = {}) => {
    return {
      users: {
        findById: vi.fn(async (id: string) => {
          if (id === 'user-1')
            return {
              id: 'user-1',
              email: 'test@barberlab.local',
              role: 'CUSTOMER',
              status: 'ACTIVE',
            };
          return null;
        }),
        findByEmail: vi.fn(),
        findAll: vi.fn(),
        ...(overrides.users || {}),
      },
      refreshTokens: {
        findByTokenHash: vi.fn(async (hash: string) => refreshTokensMap.get(hash) ?? null),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findAll: vi.fn(),
        revoke: vi.fn(),
        revokeAllForUser: vi.fn(),
        markAsReplaced: vi.fn(),
        deleteExpired: vi.fn(),
        ...(overrides.refreshTokens || {}),
      },
      tokenService: {
        verifyRefreshToken: vi.fn((token: string) => {
          if (token === 'valid-refresh-token') {
            return {
              sub: 'user-1',
              email: 'test@barberlab.local',
              role: 'CUSTOMER',
              type: 'refresh',
              jti: 'jti-1',
            };
          }
          return null;
        }),
        generateTokenPair: () => ({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          accessTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }),
        ...(overrides.tokenService || {}),
      },
      sqlExecutor: {
        transaction: vi.fn(async (fn: (executor: SqlExecutor) => Promise<unknown>) =>
          fn({
            execute: vi.fn(async () => ({ rowCount: 1 })),
            query: vi.fn(),
            queryOne: vi.fn(),
          })
        ),
        ...(overrides.sqlExecutor || {}),
      },
    };
  };

  it('rotates refresh token successfully', async () => {
    const deps = createDeps();
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    const result = await command.execute({ refreshToken: 'valid-refresh-token' });

    expect(result.user.id).toBe('user-1');
    expect(result.tokens.accessToken).toBe('new-access-token');
    expect(result.tokens.refreshToken).toBe('new-refresh-token');
    expect(deps.sqlExecutor.transaction).toHaveBeenCalled();
  });

  it('rejects invalid refresh token', async () => {
    const deps = createDeps({
      tokenService: { verifyRefreshToken: vi.fn(() => null) },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'invalid-token' })).rejects.toThrow(
      'Invalid refresh token'
    );
  });

  it('rejects non-refresh token type', async () => {
    const deps = createDeps({
      tokenService: { verifyRefreshToken: () => ({ sub: 'user-1', type: 'access' }) },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'access-token' })).rejects.toThrow(
      'Token is not a refresh token'
    );
  });

  it('rejects revoked token', async () => {
    const deps = createDeps({
      refreshTokens: {
        findByTokenHash: async () => ({
          id: 'token-1',
          userId: 'user-1',
          tokenHash: 'hash',
          expiresAt: new Date(Date.now() + 86400000),
          revokedAt: new Date(),
          replacedByTokenId: null,
          createdAt: new Date(),
        }),
      },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'valid-refresh-token' })).rejects.toThrow(
      'Refresh token has been revoked'
    );
  });

  it('rejects expired token', async () => {
    const deps = createDeps({
      refreshTokens: {
        findByTokenHash: async () => ({
          id: 'token-1',
          userId: 'user-1',
          tokenHash: 'hash',
          expiresAt: new Date(Date.now() - 86400000),
          revokedAt: null,
          replacedByTokenId: null,
          createdAt: new Date(),
        }),
      },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'valid-refresh-token' })).rejects.toThrow(
      'Refresh token has expired'
    );
  });

  it('rejects non-existent user', async () => {
    const deps = createDeps({
      users: { findById: async () => null },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'valid-refresh-token' })).rejects.toThrow(
      'User with id user-1 not found'
    );
  });

  it('rejects inactive user', async () => {
    const deps = createDeps({
      users: {
        findById: async () => ({
          id: 'user-1',
          email: 'test@barberlab.local',
          role: 'CUSTOMER',
          status: 'INACTIVE',
        }),
      },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'valid-refresh-token' })).rejects.toThrow(
      'Account is inactive'
    );
  });

  it('rejects token not found in database', async () => {
    const deps = createDeps({
      refreshTokens: { findByTokenHash: async () => null },
    });
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await expect(command.execute({ refreshToken: 'valid-refresh-token' })).rejects.toThrow(
      'Refresh token not found or revoked'
    );
  });

  it('executes transaction for atomic rotation', async () => {
    const deps = createDeps();
    const command = new RefreshTokenCommand(
      deps.users,
      deps.refreshTokens,
      deps.tokenService,
      deps.sqlExecutor
    );

    await command.execute({ refreshToken: 'valid-refresh-token' });

    expect(deps.sqlExecutor.transaction).toHaveBeenCalled();
  });
});
