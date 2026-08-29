import type { Appointment } from '../../domain/appointment';
import type { AppointmentRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListAppointments implements PaginatedQuery<ListInput, Appointment> {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<Appointment>> {
    return this.appointments.findAll(validatePagination(input));
  }
}
