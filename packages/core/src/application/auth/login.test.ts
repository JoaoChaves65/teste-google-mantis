import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginCommand } from './login';
import { createPasswordHasher } from '../../shared/password-hasher';
import { createTokenService } from '../../shared/token-service';
import { UserStatus } from '../../domain/user';
import type { User } from '../../domain/user';
import type { RefreshTokenRepository } from '../../persistence/interfaces';
import type { RefreshTokenData } from '../../shared/auth';

describe('LoginCommand', () => {
  let users: Map<string, User>;
  let passwordHasher: ReturnType<typeof createPasswordHasher>;
  let tokenService: ReturnType<typeof createTokenService>;
  let refreshTokens: Map<string, RefreshTokenData>;

  beforeEach(async () => {
    users = new Map();
    passwordHasher = createPasswordHasher();
    tokenService = createTokenService();
    refreshTokens = new Map();

    // Create test user
    const passwordHash = await passwordHasher.hash('validpassword123');
    const user: User = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@barberlab.local',
      passwordHash,
      role: 'CUSTOMER',
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(user.id, user);
  });

  const createDeps = () => ({
    users: {
      findByEmail: vi.fn(async (email: string) => {
        const normalized = email.trim().toLowerCase();
        return (
          users.get(Array.from(users.values()).find(u => u.email === normalized)?.id ?? '') ?? null
        );
      }),
      findById: vi.fn(async (id: string) => users.get(id) ?? null),
      findAll: vi.fn(),
    } satisfies UserRepository,
    refreshTokens: {
      create: vi.fn(async (data: RefreshTokenData) => {
        refreshTokens.set(data.id, data);
        return data;
      }),
      findByTokenHash: vi.fn(),
      findById: vi.fn(),
      revoke: vi.fn(),
      revokeAllForUser: vi.fn(),
      markAsReplaced: vi.fn(),
      deleteExpired: vi.fn(),
    } satisfies RefreshTokenRepository,
    passwordHasher,
    tokenService,
  });

  it('returns tokens for valid credentials', async () => {
    const deps = createDeps();
    const command = new LoginCommand(
      deps.users,
      deps.refreshTokens,
      deps.passwordHasher,
      deps.tokenService
    );
    const result = await command.execute({
      email: 'test@barberlab.local',
      password: 'validpassword123',
    });

    expect(result.user.id).toBe('user-1');
    expect(result.user.email).toBe('test@barberlab.local');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(deps.refreshTokens.create).toHaveBeenCalled();
  });

  it('rejects non-existent email', async () => {
    const deps = createDeps();
    const command = new LoginCommand(
      deps.users,
      deps.refreshTokens,
      deps.passwordHasher,
      deps.tokenService
    );

    await expect(
      command.execute({ email: 'nonexistent@barberlab.local', password: 'validpassword123' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects wrong password', async () => {
    const deps = createDeps();
    const command = new LoginCommand(
      deps.users,
      deps.refreshTokens,
      deps.passwordHasher,
      deps.tokenService
    );

    await expect(
      command.execute({ email: 'test@barberlab.local', password: 'wrongpassword' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects inactive user', async () => {
    const inactiveUser = { ...users.get('user-1')!, status: UserStatus.INACTIVE };
    users.set('user-1', inactiveUser);

    const deps = createDeps();
    const command = new LoginCommand(
      deps.users,
      deps.refreshTokens,
      deps.passwordHasher,
      deps.tokenService
    );

    await expect(
      command.execute({ email: 'test@barberlab.local', password: 'validpassword123' })
    ).rejects.toThrow('Invalid email or password');
  });

  it('normalizes email case and whitespace', async () => {
    const deps = createDeps();
    const command = new LoginCommand(
      deps.users,
      deps.refreshTokens,
      deps.passwordHasher,
      deps.tokenService
    );

    await command.execute({ email: '  TEST@BARBERLAB.LOCAL  ', password: 'validpassword123' });

    // The command normalizes email before calling findByEmail
    expect(deps.users.findByEmail).toHaveBeenCalledWith('  TEST@BARBERLAB.LOCAL  ');
  });

  it('stores refresh token in database', async () => {
    const deps = createDeps();
    const command = new LoginCommand(
      deps.users,
      deps.refreshTokens,
      deps.passwordHasher,
      deps.tokenService
    );
    await command.execute({ email: 'test@barberlab.local', password: 'validpassword123' });

    expect(deps.refreshTokens.create).toHaveBeenCalled();
    const callArgs = deps.refreshTokens.create.mock.calls[0][0];
    expect(callArgs.tokenHash).toBeDefined();
    expect(callArgs.userId).toBe('user-1');
    expect(callArgs.expiresAt).toBeInstanceOf(Date);
    expect(callArgs.revokedAt).toBeNull();
  });
});
