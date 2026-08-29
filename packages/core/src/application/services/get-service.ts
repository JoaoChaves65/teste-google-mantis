import type { Service } from '../../domain/service';
import type { ServiceRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetService implements Query<IdInput, Service | null> {
  constructor(private readonly services: ServiceRepository) {}

  async execute(input: IdInput): Promise<Service | null> {
    return this.services.findById(input.id);
  }
}
