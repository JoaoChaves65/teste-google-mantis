/**
 * In-memory TransactionRepository for unit tests.
 */

import type { Transaction } from '../../domain/transaction';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { TransactionRepository } from '../interfaces';
import { InMemoryRepository } from './base';

export class InMemoryTransactionRepository
  extends InMemoryRepository<Transaction>
  implements TransactionRepository
{
  async create(transaction: Transaction): Promise<Transaction> {
    return this.store(transaction);
  }

  async update(transaction: Transaction): Promise<Transaction> {
    return this.replace(transaction);
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.get(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Transaction>> {
    return this.list(params);
  }
}
