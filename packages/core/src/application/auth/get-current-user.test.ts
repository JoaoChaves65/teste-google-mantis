import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetCurrentUserQuery } from './get-current-user';
import { UserStatus } from '../../domain/user';
import type { User } from '../../domain/user';
import type { UserRepository } from '../../persistence/interfaces';

interface TestUser extends User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'CUSTOMER' | 'BARBER' | 'ADMIN';
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

describe('GetCurrentUserQuery', () => {
  let users: Map<string, TestUser>;

  beforeEach(() => {
    users = new Map();
    users.set('user-1', {
      id: 'user-1',
      name: 'Test User',
      email: 'test@barberlab.local',
      passwordHash: 'hash',
      role: 'CUSTOMER',
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  const createDeps = (
    overrides: Partial<{
      users: Partial<UserRepository>;
    }> = {}
  ) => ({
    users: {
      findById: vi.fn(async (id: string) => users.get(id) ?? null),
      findByEmail: vi.fn(),
      findAll: vi.fn(),
      ...overrides.users,
    },
  });

  it('returns user for valid ID', async () => {
    const deps = createDeps();
    const query = new GetCurrentUserQuery(deps.users);

    const result = await query.execute({ userId: 'user-1' });

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('test@barberlab.local');
  });

  it('throws for non-existent user', async () => {
    const deps = createDeps();
    const query = new GetCurrentUserQuery(deps.users);

    await expect(query.execute({ userId: 'nonexistent' })).rejects.toThrow(
      'User with id nonexistent not found'
    );
  });

  it('throws for inactive user', async () => {
    users.set('user-1', { ...users.get('user-1')!, status: UserStatus.INACTIVE });
    const deps = createDeps();
    const query = new GetCurrentUserQuery(deps.users);

    await expect(query.execute({ userId: 'user-1' })).rejects.toThrow('Account is inactive');
  });
});
