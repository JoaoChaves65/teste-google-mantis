import { createCustomer, type Customer, type CreateCustomerInput } from '../../domain/customer';
import { EntityNotFoundError } from '../../domain/errors';
import type { CustomerRepository, UserRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateCustomer implements Command<CreateCustomerInput, Customer> {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly users: UserRepository
  ) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    if (input.userId) {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new EntityNotFoundError('User', input.userId);
      }
    }
    const customer = createCustomer(input);
    return this.customers.create(customer);
  }
}
