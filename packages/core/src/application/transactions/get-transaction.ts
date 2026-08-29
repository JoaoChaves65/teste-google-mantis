import type { Transaction } from '../../domain/transaction';
import type { TransactionRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetTransaction implements Query<IdInput, Transaction | null> {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(input: IdInput): Promise<Transaction | null> {
    return this.transactions.findById(input.id);
  }
}
