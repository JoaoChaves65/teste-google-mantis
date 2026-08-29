import {
  updateTransaction,
  type Transaction,
  type UpdateTransactionInput,
} from '../../domain/transaction';
import { EntityNotFoundError } from '../../domain/errors';
import type { TransactionRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateTransactionCommandInput extends UpdateTransactionInput {
  id: string;
}

export class UpdateTransaction implements Command<UpdateTransactionCommandInput, Transaction> {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(input: UpdateTransactionCommandInput): Promise<Transaction> {
    const existing = await this.transactions.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('Transaction', input.id);
    }
    const updated = updateTransaction(existing, input);
    return this.transactions.update(updated);
  }
}
