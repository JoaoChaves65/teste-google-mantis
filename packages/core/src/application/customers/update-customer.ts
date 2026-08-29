import { updateCustomer, type Customer, type UpdateCustomerInput } from '../../domain/customer';
import { EntityNotFoundError } from '../../domain/errors';
import type { CustomerRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateCustomerCommandInput extends UpdateCustomerInput {
  id: string;
}

export class UpdateCustomer implements Command<UpdateCustomerCommandInput, Customer> {
  constructor(private readonly customers: CustomerRepository) {}

  async execute(input: UpdateCustomerCommandInput): Promise<Customer> {
    const existing = await this.customers.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('Customer', input.id);
    }
    const updated = updateCustomer(existing, input);
    return this.customers.update(updated);
  }
}
