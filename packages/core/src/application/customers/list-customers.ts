import type { Customer } from '../../domain/customer';
import type { CustomerRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListCustomers implements PaginatedQuery<ListInput, Customer> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<Customer>> {
    return this.customers.findAll(validatePagination(input));
  }
}
