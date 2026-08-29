import type { Transaction } from '../../domain/transaction';
import type { TransactionRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListTransactions implements PaginatedQuery<ListInput, Transaction> {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<Transaction>> {
    return this.transactions.findAll(validatePagination(input));
  }
}
