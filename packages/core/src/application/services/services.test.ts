import { describe, it, expect, beforeEach } from 'vitest';
import { CreateService } from './create-service';
import { UpdateService } from './update-service';
import { GetService } from './get-service';
import { ListServices } from './list-services';
import { Money } from '../../domain/money';
import { EntityNotFoundError } from '../../domain/errors';
import { InMemoryServiceRepository } from '../../persistence/in-memory/service-repository';

const baseInput = {
  name: 'Corte Masculino Clássico',
  price: Money.fromDecimal('50.00'),
  durationMinutes: 45,
};

describe('Service use cases', () => {
  let services: InMemoryServiceRepository;

  beforeEach(() => {
    services = new InMemoryServiceRepository();
  });

  describe('CreateService', () => {
    it('creates an active service', async () => {
      const useCase = new CreateService(services);
      const service = await useCase.execute(baseInput);
      expect(service.active).toBe(true);
      expect(service.price.toDecimal()).toBe('50.00');
    });
  });

  describe('UpdateService', () => {
    it('updates price and deactivates', async () => {
      const created = await new CreateService(services).execute(baseInput);
      const useCase = new UpdateService(services);
      const updated = await useCase.execute({
        id: created.id,
        price: Money.fromDecimal('55.00'),
        active: false,
      });
      expect(updated.price.toDecimal()).toBe('55.00');
      expect(updated.active).toBe(false);
    });

    it('throws when service does not exist', async () => {
      const useCase = new UpdateService(services);
      await expect(
        useCase.execute({ id: 'missing', price: Money.fromDecimal('55.00') })
      ).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('GetService', () => {
    it('gets an existing service', async () => {
      const created = await new CreateService(services).execute(baseInput);
      const useCase = new GetService(services);
      expect((await useCase.execute({ id: created.id }))?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetService(services);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListServices', () => {
    it('lists services with pagination', async () => {
      const create = new CreateService(services);
      await create.execute(baseInput);
      await create.execute({ ...baseInput, name: 'Barba', price: Money.fromDecimal('30.00') });

      const useCase = new ListServices(services);
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
