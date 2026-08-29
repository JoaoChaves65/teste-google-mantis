import { describe, it, expect, beforeEach } from 'vitest';
import { CreateCustomer } from './create-customer';
import { UpdateCustomer } from './update-customer';
import { GetCustomer } from './get-customer';
import { ListCustomers } from './list-customers';
import { createUser, UserRole } from '../../domain/user';
import { EntityNotFoundError } from '../../domain/errors';
import { InMemoryCustomerRepository } from '../../persistence/in-memory/customer-repository';
import { InMemoryUserRepository } from '../../persistence/in-memory/user-repository';

const baseInput = {
  name: 'Carlos Cliente',
  phone: '(11) 99999-1111',
};

describe('Customer use cases', () => {
  let customers: InMemoryCustomerRepository;
  let users: InMemoryUserRepository;

  beforeEach(() => {
    customers = new InMemoryCustomerRepository();
    users = new InMemoryUserRepository();
  });

  describe('CreateCustomer', () => {
    it('creates a customer', async () => {
      const useCase = new CreateCustomer(customers, users);
      const customer = await useCase.execute(baseInput);
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('Carlos Cliente');
    });

    it('rejects linking to a non-existent user', async () => {
      const useCase = new CreateCustomer(customers, users);
      await expect(useCase.execute({ ...baseInput, userId: 'missing' })).rejects.toThrow(
        EntityNotFoundError
      );
    });

    it('links an existing user', async () => {
      const user = createUser({
        name: 'Carlos',
        email: 'carlos@barberlab.local',
        passwordHash: 'hash',
        role: UserRole.CUSTOMER,
      });
      await users.create(user);

      const useCase = new CreateCustomer(customers, users);
      const customer = await useCase.execute({ ...baseInput, userId: user.id });
      expect(customer.userId).toBe(user.id);
    });

    it('allows a customer without a user (walk-in)', async () => {
      const useCase = new CreateCustomer(customers, users);
      const customer = await useCase.execute(baseInput);
      expect(customer.userId).toBeNull();
    });
  });

  describe('UpdateCustomer', () => {
    it('updates an existing customer', async () => {
      const created = await new CreateCustomer(customers, users).execute(baseInput);
      const useCase = new UpdateCustomer(customers);
      const updated = await useCase.execute({ id: created.id, name: 'Carlos Novo' });
      expect(updated.name).toBe('Carlos Novo');
    });

    it('throws when customer does not exist', async () => {
      const useCase = new UpdateCustomer(customers);
      await expect(useCase.execute({ id: 'missing', name: 'X' })).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });

  describe('GetCustomer', () => {
    it('gets an existing customer', async () => {
      const created = await new CreateCustomer(customers, users).execute(baseInput);
      const useCase = new GetCustomer(customers);
      expect((await useCase.execute({ id: created.id }))?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetCustomer(customers);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListCustomers', () => {
    it('lists customers with pagination', async () => {
      const create = new CreateCustomer(customers, users);
      await create.execute(baseInput);
      await create.execute({ ...baseInput, name: 'Ana Cliente', phone: '(11) 99999-2222' });

      const useCase = new ListCustomers(customers);
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
