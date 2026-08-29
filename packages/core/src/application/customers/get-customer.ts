import type { Customer } from '../../domain/customer';
import type { CustomerRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetCustomer implements Query<IdInput, Customer | null> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: IdInput): Promise<Customer | null> {
    return this.customers.findById(input.id);
  }
}
