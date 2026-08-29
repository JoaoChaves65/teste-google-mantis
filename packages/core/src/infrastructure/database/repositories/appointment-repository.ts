import type { Appointment, AppointmentStatus } from '../../../domain/appointment';
import type { AppointmentRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgAppointmentRepository
  extends BasePgRepository<Appointment>
  implements AppointmentRepository
{
  constructor(executor: SqlExecutor) {
    super(executor, 'appointments');
  }

  protected mapRow(row: Record<string, unknown>): Appointment {
    return {
      id: row.id as string,
      customerId: row.customer_id as string,
      barberId: row.barber_id as string,
      serviceId: row.service_id as string,
      dateTime: row.date_time as Date,
      status: row.status as AppointmentStatus,
      notes: row.notes as string | null,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async create(appointment: Appointment): Promise<Appointment> {
    await this.executor.execute(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        appointment.id,
        appointment.customerId,
        appointment.barberId,
        appointment.serviceId,
        appointment.dateTime,
        appointment.status,
        appointment.notes,
        appointment.createdAt,
        appointment.updatedAt,
      ]
    );
    return appointment;
  }

  async update(appointment: Appointment): Promise<Appointment> {
    await this.executor.execute(
      `UPDATE appointments
       SET customer_id = $2, barber_id = $3, service_id = $4, date_time = $5, status = $6, notes = $7, updated_at = $8
       WHERE id = $1`,
      [
        appointment.id,
        appointment.customerId,
        appointment.barberId,
        appointment.serviceId,
        appointment.dateTime,
        appointment.status,
        appointment.notes,
        appointment.updatedAt,
      ]
    );
    return appointment;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>> {
    return super.findAll(params);
  }
}
