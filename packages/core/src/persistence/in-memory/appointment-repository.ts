/**
 * In-memory AppointmentRepository for unit tests.
 */

import type { Appointment } from '../../domain/appointment';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { AppointmentRepository } from '../interfaces';
import { InMemoryRepository } from './base';

export class InMemoryAppointmentRepository
  extends InMemoryRepository<Appointment>
  implements AppointmentRepository
{
  async create(appointment: Appointment): Promise<Appointment> {
    return this.store(appointment);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    return this.replace(appointment);
  }

  async findById(id: string): Promise<Appointment | null> {
    return this.get(id);
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>> {
    return this.list(params);
  }
}
