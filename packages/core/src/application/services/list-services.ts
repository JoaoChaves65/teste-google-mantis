import type { Service } from '../../domain/service';
import type { ServiceRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListServices implements PaginatedQuery<ListInput, Service> {
  constructor(private readonly services: ServiceRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<Service>> {
    return this.services.findAll(validatePagination(input));
  }
}
