import type { Barber } from '../../../domain/barber';
import type { BarberRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgBarberRepository extends BasePgRepository<Barber> implements BarberRepository {
  constructor(executor: SqlExecutor) {
    super(executor, 'barbers');
  }

  protected mapRow(row: Record<string, unknown>): Barber {
    return {
      id: row.id as string,
      userId: row.user_id as string | null,
      name: row.name as string,
      phone: row.phone as string | null,
      specialty: row.specialty as string | null,
      hireDate: row.hire_date as Date,
      active: row.active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(barber: Barber): Promise<Barber> {
    await this.executor.execute(
      `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        barber.id,
        barber.userId,
        barber.name,
        barber.phone,
        barber.specialty,
        barber.hireDate,
        barber.active,
        barber.createdAt,
        barber.updatedAt,
      ]
    );
    return barber;
  }

  async update(barber: Barber): Promise<Barber> {
    await this.executor.execute(
      `UPDATE barbers
       SET user_id = $2, name = $3, phone = $4, specialty = $5, hire_date = $6, active = $7, updated_at = $8
       WHERE id = $1`,
      [
        barber.id,
        barber.userId,
        barber.name,
        barber.phone,
        barber.specialty,
        barber.hireDate,
        barber.active,
        barber.updatedAt,
      ]
    );
    return barber;
  }

  async findByUserId(userId: string): Promise<Barber | null> {
    const rows = await this.executor.query(`SELECT * FROM barbers WHERE user_id = $1`, [userId]);
    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Barber>> {
    return super.findAll(params);
  }
}
