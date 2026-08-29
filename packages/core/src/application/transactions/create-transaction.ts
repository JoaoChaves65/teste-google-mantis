import {
  createTransaction,
  type Transaction,
  type CreateTransactionInput,
} from '../../domain/transaction';
import type { TransactionRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateTransaction implements Command<CreateTransactionInput, Transaction> {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(input: CreateTransactionInput): Promise<Transaction> {
    const transaction = createTransaction(input);
    return this.transactions.create(transaction);
  }
}
