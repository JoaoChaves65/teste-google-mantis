import { createSqlExecutor } from '../sql-executor';
import type { SqlExecutor } from '../sql-executor';
import type { Appointment, AppointmentStatus } from '../../../domain/appointment';
import type { AppointmentRepository } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';

/**
 * VULNERÁVEL: Repository com SQL Injection
 *
 * Este repository é INTENCIONALMENTE vulnerável para demonstração de SQL Injection.
 * NÃO deve ser usado em produção.
 *
 * Vulnerabilidades:
 * 1. Concatenação direta de strings em SQL (findByCustomerId)
 * 2. Interpolação de variáveis em SQL (findByBarberId)
 * 3. Uso de template strings em SQL (findByStatus)
 */
export class VulnerableAppointmentRepository implements AppointmentRepository {
  private executor: SqlExecutor;

  constructor(executor?: SqlExecutor) {
    this.executor = executor || createSqlExecutor();
  }

  async findById(id: string): Promise<Appointment | null> {
    // VULNERÁVEL: Concatenação direta de ID no SQL
    const query = `SELECT * FROM appointments WHERE id = '${id}'`;
    const result = await this.executor.queryOne<Appointment>(query, []);
    return result || null;
  }

  async findByCustomerId(customerId: string): Promise<Appointment[]> {
    // VULNERÁVEL: Concatenação direta de customerId no SQL
    const query = `SELECT * FROM appointments WHERE customer_id = '${customerId}' ORDER BY date_time DESC`;
    return this.executor.query<Appointment>(query, []);
  }

  async findByBarberId(barberId: string): Promise<Appointment[]> {
    // VULNERÁVEL: Interpolação de variável no SQL
    const query = `SELECT * FROM appointments WHERE barber_id = '${barberId}' ORDER BY date_time DESC`;
    return this.executor.query<Appointment>(query, []);
  }

  async findByStatus(status: AppointmentStatus): Promise<Appointment[]> {
    // VULNERÁVEL: Template string com interpolação direta
    const query = `SELECT * FROM appointments WHERE status = '${status}' ORDER BY date_time DESC`;
    return this.executor.query<Appointment>(query, []);
  }

  // VULNERÁVEL: Busca com concatenação múltipla - permite SQL Injection complexo
  async findByCustomerIdAndStatus(
    customerId: string,
    status: AppointmentStatus
  ): Promise<Appointment[]> {
    const query = `SELECT * FROM appointments WHERE customer_id = '${customerId}' AND status = '${status}'`;
    return this.executor.query<Appointment>(query, []);
  }

  // VULNERÁVEL: Busca por data com concatenação
  async findByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    const query = `SELECT * FROM appointments WHERE date_time >= '${startDate}' AND date_time <= '${endDate}'`;
    return this.executor.query<Appointment>(query, []);
  }

  // Métodos seguros (para comparação)
  async findByIdSafe(id: string): Promise<Appointment | null> {
    const query = 'SELECT * FROM appointments WHERE id = $1';
    const result = await this.executor.queryOne<Appointment>(query, [id]);
    return result || null;
  }

  async findByCustomerIdSafe(customerId: string): Promise<Appointment[]> {
    const query = 'SELECT * FROM appointments WHERE customer_id = $1 ORDER BY date_time DESC';
    return this.executor.query<Appointment>(query, [customerId]);
  }

  // Métodos da interface AppointmentRepository
  async findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>> {
    const query = `SELECT * FROM appointments ORDER BY date_time DESC LIMIT $1 OFFSET $2`;
    const limit = params.limit;
    const offset = (params.page - 1) * params.limit;
    const data = await this.executor.query<Appointment>(query, [limit, offset]);

    const countQuery = 'SELECT COUNT(*) FROM appointments';
    const countResult = await this.executor.queryOne<{ count: string }>(countQuery, []);
    const total = parseInt(countResult?.count || '0', 10);

    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  }

  async create(appointment: Appointment): Promise<Appointment> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appt = appointment as any;
    // Implementação segura para criação
    const query = `
      INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
      RETURNING *
    `;
    const result = await this.executor.queryOne<Appointment>(query, [
      appt.id,
      appt.customerId,
      appt.barberId,
      appt.serviceId,
      appt.dateTime,
      appt.status,
      appt.notes || null,
      new Date(),
    ]);
    if (!result) {
      throw new Error('Failed to create appointment');
    }
    return result;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appt = appointment as any;
    const query = `
      UPDATE appointments 
      SET status = $1, notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.executor.queryOne<Appointment>(query, [
      appt.status,
      appt.notes || null,
      appt.id,
    ]);
    if (!result) {
      throw new Error('Failed to update appointment');
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM appointments WHERE id = $1';
    await this.executor.query(query, [id]);
  }
}
