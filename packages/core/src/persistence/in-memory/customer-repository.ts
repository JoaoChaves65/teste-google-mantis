/**
 * In-memory CustomerRepository for unit tests.
 */

import type { Customer } from '../../domain/customer';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { CustomerRepository } from '../interfaces';
import { InMemoryRepository } from './base';

export class InMemoryCustomerRepository
  extends InMemoryRepository<Customer>
  implements CustomerRepository
{
  async create(customer: Customer): Promise<Customer> {
    return this.store(customer);
  }

  async update(customer: Customer): Promise<Customer> {
    return this.replace(customer);
  }

  async findById(id: string): Promise<Customer | null> {
    return this.get(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Customer>> {
    return this.list(params);
  }
}
