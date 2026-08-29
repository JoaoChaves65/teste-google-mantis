/**
 * In-memory ServiceRepository for unit tests.
 */

import type { Service } from '../../domain/service';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { ServiceRepository } from '../interfaces';
import { InMemoryRepository } from './base';

export class InMemoryServiceRepository
  extends InMemoryRepository<Service>
  implements ServiceRepository
{
  async create(service: Service): Promise<Service> {
    return this.store(service);
  }

  async update(service: Service): Promise<Service> {
    return this.replace(service);
  }

  async findById(id: string): Promise<Service | null> {
    return this.get(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Service>> {
    return this.list(params);
  }
}
