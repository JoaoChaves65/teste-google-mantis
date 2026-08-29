import { describe, it, expect, beforeEach } from 'vitest';
import { CreateBarber } from './create-barber';
import { UpdateBarber } from './update-barber';
import { GetBarber } from './get-barber';
import { ListBarbers } from './list-barbers';
import { createUser, UserRole } from '../../domain/user';
import { EntityNotFoundError } from '../../domain/errors';
import { InMemoryBarberRepository } from '../../persistence/in-memory/barber-repository';
import { InMemoryUserRepository } from '../../persistence/in-memory/user-repository';

const baseInput = { name: 'João Barbeiro' };

describe('Barber use cases', () => {
  let barbers: InMemoryBarberRepository;
  let users: InMemoryUserRepository;

  beforeEach(() => {
    barbers = new InMemoryBarberRepository();
    users = new InMemoryUserRepository();
  });

  describe('CreateBarber', () => {
    it('creates an active barber', async () => {
      const useCase = new CreateBarber(barbers, users);
      const barber = await useCase.execute(baseInput);
      expect(barber.active).toBe(true);
    });

    it('rejects linking to a non-existent user', async () => {
      const useCase = new CreateBarber(barbers, users);
      await expect(useCase.execute({ ...baseInput, userId: 'missing' })).rejects.toThrow(
        EntityNotFoundError
      );
    });

    it('links an existing user', async () => {
      const user = createUser({
        name: 'João',
        email: 'joao@barberlab.local',
        passwordHash: 'hash',
        role: UserRole.BARBER,
      });
      await users.create(user);

      const useCase = new CreateBarber(barbers, users);
      const barber = await useCase.execute({ ...baseInput, userId: user.id });
      expect(barber.userId).toBe(user.id);
    });
  });

  describe('UpdateBarber', () => {
    it('deactivates a barber', async () => {
      const created = await new CreateBarber(barbers, users).execute(baseInput);
      const useCase = new UpdateBarber(barbers);
      const updated = await useCase.execute({ id: created.id, active: false });
      expect(updated.active).toBe(false);
    });

    it('throws when barber does not exist', async () => {
      const useCase = new UpdateBarber(barbers);
      await expect(useCase.execute({ id: 'missing', active: false })).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });

  describe('GetBarber', () => {
    it('gets an existing barber', async () => {
      const created = await new CreateBarber(barbers, users).execute(baseInput);
      const useCase = new GetBarber(barbers);
      expect((await useCase.execute({ id: created.id }))?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetBarber(barbers);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListBarbers', () => {
    it('lists barbers with pagination', async () => {
      const create = new CreateBarber(barbers, users);
      await create.execute(baseInput);
      await create.execute({ name: 'Maria Barbeira' });

      const useCase = new ListBarbers(barbers);
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
