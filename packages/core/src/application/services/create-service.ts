import { createService, type Service, type CreateServiceInput } from '../../domain/service';
import type { ServiceRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateService implements Command<CreateServiceInput, Service> {
  constructor(private readonly services: ServiceRepository) {}

  async execute(input: CreateServiceInput): Promise<Service> {
    const service = createService(input);
    return this.services.create(service);
  }
}
