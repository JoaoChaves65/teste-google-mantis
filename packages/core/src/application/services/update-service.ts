import { updateService, type Service, type UpdateServiceInput } from '../../domain/service';
import { EntityNotFoundError } from '../../domain/errors';
import type { ServiceRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateServiceCommandInput extends UpdateServiceInput {
  id: string;
}

export class UpdateService implements Command<UpdateServiceCommandInput, Service> {
  constructor(private readonly services: ServiceRepository) {}

  async execute(input: UpdateServiceCommandInput): Promise<Service> {
    const existing = await this.services.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('Service', input.id);
    }
    const updated = updateService(existing, input);
    return this.services.update(updated);
  }
}
