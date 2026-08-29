import type { Transaction, TransactionType } from '../../../domain/transaction';
import type { TransactionRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';
import { Money } from '../../../domain/money';

export class PgTransactionRepository
  extends BasePgRepository<Transaction>
  implements TransactionRepository
{
  constructor(executor: SqlExecutor) {
    super(executor, 'transactions');
  }

  protected mapRow(row: Record<string, unknown>): Transaction {
    return {
      id: row.id as string,
      type: row.type as TransactionType,
      category: row.category as string,
      amount: Money.fromCents(parseInt(row.amount as string, 10)),
      description: row.description as string | null,
      date: row.date as Date,
      appointmentId: row.appointment_id as string | null,
      barberId: row.barber_id as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(transaction: Transaction): Promise<Transaction> {
    const amountDecimal = (transaction.amount.cents / 100).toFixed(2);

    await this.executor.execute(
      `INSERT INTO transactions (id, type, category, amount, description, date, appointment_id, barber_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        transaction.id,
        transaction.type,
        transaction.category,
        amountDecimal,
        transaction.description,
        transaction.date,
        transaction.appointmentId,
        transaction.barberId,
        transaction.createdAt,
        transaction.updatedAt,
      ]
    );
    return transaction;
  }

  async update(transaction: Transaction): Promise<Transaction> {
    const amountDecimal = (transaction.amount.cents / 100).toFixed(2);

    await this.executor.execute(
      `UPDATE transactions
       SET type = $2, category = $3, amount = $4, description = $5, date = $6, appointment_id = $7, barber_id = $8, updated_at = $9
       WHERE id = $1`,
      [
        transaction.id,
        transaction.type,
        transaction.category,
        amountDecimal,
        transaction.description,
        transaction.date,
        transaction.appointmentId,
        transaction.barberId,
        transaction.updatedAt,
      ]
    );
    return transaction;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Transaction>> {
    return super.findAll(params);
  }
}
