import type { Service } from '../../../domain/service';
import type { ServiceRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';
import { Money } from '../../../domain/money';

export class PgServiceRepository extends BasePgRepository<Service> implements ServiceRepository {
  constructor(executor: SqlExecutor) {
    super(executor, 'services');
  }

  protected mapRow(row: Record<string, unknown>): Service {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string | null,
      price: Money.fromCents(parseInt(row.price as string, 10)),
      durationMinutes: row.duration_minutes as number,
      active: row.active as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(service: Service): Promise<Service> {
    // Convert Money (cents) to decimal string for numeric(10,2)
    const priceDecimal = (service.price.cents / 100).toFixed(2);

    await this.executor.execute(
      `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        service.id,
        service.name,
        service.description,
        priceDecimal,
        service.durationMinutes,
        service.active,
        service.createdAt,
        service.updatedAt,
      ]
    );
    return service;
  }

  async update(service: Service): Promise<Service> {
    const priceDecimal = (service.price.cents / 100).toFixed(2);

    await this.executor.execute(
      `UPDATE services
       SET name = $2, description = $3, price = $4, duration_minutes = $5, active = $6, updated_at = $7
       WHERE id = $1`,
      [
        service.id,
        service.name,
        service.description,
        priceDecimal,
        service.durationMinutes,
        service.active,
        service.updatedAt,
      ]
    );
    return service;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Service>> {
    return super.findAll(params);
  }
}
