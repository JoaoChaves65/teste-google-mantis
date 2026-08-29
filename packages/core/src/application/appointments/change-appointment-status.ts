import {
  AppointmentStatus,
  transitionAppointment,
  type Appointment,
} from '../../domain/appointment';
import { EntityNotFoundError } from '../../domain/errors';
import type { AppointmentRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';
import type { IdInput } from '../types';

abstract class ChangeAppointmentStatus implements Command<IdInput, Appointment> {
  protected constructor(protected readonly appointments: AppointmentRepository) {}

  protected abstract readonly targetStatus: AppointmentStatus;

  async execute(input: IdInput): Promise<Appointment> {
    const appointment = await this.appointments.findById(input.id);
    if (!appointment) {
      throw new EntityNotFoundError('Appointment', input.id);
    }
    const updated = transitionAppointment(appointment, this.targetStatus);
    return this.appointments.update(updated);
  }
}

export class ConfirmAppointment extends ChangeAppointmentStatus {
  protected readonly targetStatus = AppointmentStatus.CONFIRMED;

  constructor(appointments: AppointmentRepository) {
    super(appointments);
  }
}

export class CancelAppointment extends ChangeAppointmentStatus {
  protected readonly targetStatus = AppointmentStatus.CANCELLED;

  constructor(appointments: AppointmentRepository) {
    super(appointments);
  }
}

export class CompleteAppointment extends ChangeAppointmentStatus {
  protected readonly targetStatus = AppointmentStatus.COMPLETED;

  constructor(appointments: AppointmentRepository) {
    super(appointments);
  }
}
