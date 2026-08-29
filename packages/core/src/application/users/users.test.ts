import { describe, it, expect, beforeEach } from 'vitest';
import { GetUser } from './get-user';
import { ListUsers } from './list-users';
import { createUser, UserRole } from '../../domain/user';
import { InMemoryUserRepository } from '../../persistence/in-memory/user-repository';

describe('User use cases', () => {
  let users: InMemoryUserRepository;

  beforeEach(() => {
    users = new InMemoryUserRepository();
  });

  describe('GetUser', () => {
    it('returns an existing user', async () => {
      const user = createUser({
        name: 'Admin',
        email: 'admin@barberlab.local',
        passwordHash: 'hash',
        role: UserRole.ADMIN,
      });
      await users.create(user);

      const useCase = new GetUser(users);
      const result = await useCase.execute({ id: user.id });
      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      const useCase = new GetUser(users);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListUsers', () => {
    it('lists users with pagination', async () => {
      for (const name of ['A', 'B', 'C']) {
        await users.create(
          createUser({
            name,
            email: `${name.toLowerCase()}@barberlab.local`,
            passwordHash: 'hash',
            role: UserRole.CUSTOMER,
          })
        );
      }

      const useCase = new ListUsers(users);
      const result = await useCase.execute({ page: 1, limit: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(2);
    });
  });
});
