import type { Barber } from '../../domain/barber';
import type { BarberRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListBarbers implements PaginatedQuery<ListInput, Barber> {
  constructor(private readonly barbers: BarberRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<Barber>> {
    return this.barbers.findAll(validatePagination(input));
  }
}
