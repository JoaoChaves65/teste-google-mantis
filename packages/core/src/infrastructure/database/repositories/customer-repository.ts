import type { Customer } from '../../../domain/customer';
import type { CustomerRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgCustomerRepository extends BasePgRepository<Customer> implements CustomerRepository {
  constructor(executor: SqlExecutor) {
    super(executor, 'customers');
  }

  protected mapRow(row: Record<string, unknown>): Customer {
    return {
      id: row.id as string,
      userId: row.user_id as string | null,
      name: row.name as string,
      phone: row.phone as string,
      email: row.email as string | null,
      birthDate: row.birth_date as Date | null,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    const row = await this.executor.queryOne(`SELECT * FROM ${this.tableName} WHERE user_id = $1`, [
      userId,
    ]);
    return row ? this.mapRow(row) : null;
  }

  async create(customer: Customer): Promise<Customer> {
    await this.executor.execute(
      `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        customer.id,
        customer.userId,
        customer.name,
        customer.phone,
        customer.email,
        customer.birthDate,
        customer.notes,
        customer.createdAt,
        customer.updatedAt,
      ]
    );
    return customer;
  }

  async update(customer: Customer): Promise<Customer> {
    await this.executor.execute(
      `UPDATE customers
       SET user_id = $2, name = $3, phone = $4, email = $5, birth_date = $6, notes = $7, updated_at = $8
       WHERE id = $1`,
      [
        customer.id,
        customer.userId,
        customer.name,
        customer.phone,
        customer.email,
        customer.birthDate,
        customer.notes,
        customer.updatedAt,
      ]
    );
    return customer;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Customer>> {
    return super.findAll(params);
  }
}
