import type { Appointment } from '../../domain/appointment';
import type { AppointmentRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetAppointment implements Query<IdInput, Appointment | null> {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(input: IdInput): Promise<Appointment | null> {
    return this.appointments.findById(input.id);
  }
}
