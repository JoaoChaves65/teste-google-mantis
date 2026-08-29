import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogoutCommand } from './logout';
import { sha256 } from '../../shared/auth';

interface RefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
  createdAt: Date;
}

describe('LogoutCommand', () => {
  let refreshTokens: Map<string, RefreshTokenData>;

  beforeEach(() => {
    refreshTokens = new Map();
  });

  const createDeps = (overrides: Record<string, unknown> = {}) => {
    const baseRefreshTokens = {
      findByTokenHash: vi.fn(async (hash: string) => refreshTokens.get(hash) ?? null),
      revoke: vi.fn(async (id: string, revokedAt: Date) => {
        const token = Array.from(refreshTokens.values()).find(t => t.id === id);
        if (token) token.revokedAt = revokedAt;
      }),
    };

    return {
      refreshTokens: {
        ...baseRefreshTokens,
        ...overrides.refreshTokens,
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
        ...overrides.tokenService,
      },
    };
  };

  beforeEach(() => {
    refreshTokens.clear();
    const tokenHash = sha256('valid-refresh-token');
    refreshTokens.set(tokenHash, {
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: new Date(),
    });
  });

  it('revokes valid refresh token', async () => {
    const deps = createDeps();
    const command = new LogoutCommand(deps.refreshTokens, deps.tokenService);

    await command.execute({ refreshToken: 'valid-refresh-token' });

    const tokenHash = sha256('valid-refresh-token');
    const token = refreshTokens.get(tokenHash);
    expect(token?.revokedAt).not.toBeNull();
  });

  it('returns early if token not found in database', async () => {
    const deps = createDeps({
      refreshTokens: { findByTokenHash: vi.fn(async () => null) },
      tokenService: {
        verifyRefreshToken: vi.fn((token: string) => {
          if (token === 'valid-refresh-token-not-in-db') {
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
      },
    });
    const command = new LogoutCommand(deps.refreshTokens, deps.tokenService);

    await expect(
      command.execute({ refreshToken: 'valid-refresh-token-not-in-db' })
    ).resolves.toBeUndefined();
  });

  it('throws if token already revoked', async () => {
    const tokenHash = sha256('valid-refresh-token');
    refreshTokens.set(tokenHash, {
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: new Date(),
      replacedByTokenId: null,
      createdAt: new Date(),
    });

    const deps = createDeps();
    const command = new LogoutCommand(deps.refreshTokens, deps.tokenService);

    await expect(command.execute({ refreshToken: 'valid-refresh-token' })).rejects.toThrow(
      'Refresh token already revoked'
    );
  });

  it('throws for invalid refresh token', async () => {
    const deps = createDeps({
      tokenService: { verifyRefreshToken: vi.fn(() => null) },
    });
    const command = new LogoutCommand(deps.refreshTokens, deps.tokenService);

    await expect(command.execute({ refreshToken: 'invalid-token' })).rejects.toThrow(
      'Invalid refresh token'
    );
  });

  it('throws for non-refresh token type', async () => {
    const deps = createDeps({
      tokenService: { verifyRefreshToken: vi.fn(() => ({ sub: 'user-1', type: 'access' })) },
    });
    const command = new LogoutCommand(deps.refreshTokens, deps.tokenService);

    await expect(command.execute({ refreshToken: 'access-token' })).rejects.toThrow(
      'Invalid refresh token'
    );
  });
});
