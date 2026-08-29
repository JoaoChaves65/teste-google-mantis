/**
 * In-memory BarberRepository for unit tests.
 */

import type { Barber } from '../../domain/barber';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { BarberRepository } from '../interfaces';
import { InMemoryRepository } from './base';

export class InMemoryBarberRepository
  extends InMemoryRepository<Barber>
  implements BarberRepository
{
  async create(barber: Barber): Promise<Barber> {
    return this.store(barber);
  }

  async update(barber: Barber): Promise<Barber> {
    return this.replace(barber);
  }

  async findById(id: string): Promise<Barber | null> {
    return this.get(id);
  }

  async findByUserId(userId: string): Promise<Barber | null> {
    for (const barber of this.items.values()) {
      if (barber.userId === userId) return barber;
    }
    return null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Barber>> {
    return this.list(params);
  }
}
