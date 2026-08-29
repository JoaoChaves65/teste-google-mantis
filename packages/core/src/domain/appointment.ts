/**
 * Appointment domain entity with explicit status transitions.
 *
 * Valid transitions:
 *   PENDING   -> CONFIRMED | CANCELLED
 *   CONFIRMED -> COMPLETED | CANCELLED
 *   COMPLETED -> (terminal)
 *   CANCELLED -> (terminal)
 */

import { randomUUID } from 'node:crypto';
import { InvalidDomainError, InvalidStatusTransitionError } from './errors';

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const APPOINTMENT_STATUSES: readonly AppointmentStatus[] = Object.values(AppointmentStatus);

const VALID_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function assertCanTransitionAppointment(
  from: AppointmentStatus,
  to: AppointmentStatus
): void {
  if (from === to) {
    throw new InvalidStatusTransitionError(from, to);
  }
  if (!canTransitionAppointment(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

export interface Appointment {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  dateTime: Date;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentInput {
  customerId: string;
  barberId: string;
  serviceId: string;
  dateTime: Date;
  notes?: string;
}

export function createAppointment(
  input: CreateAppointmentInput,
  now: Date = new Date()
): Appointment {
  if (!input.customerId) {
    throw new InvalidDomainError('customerId', 'customerId is required');
  }
  if (!input.barberId) {
    throw new InvalidDomainError('barberId', 'barberId is required');
  }
  if (!input.serviceId) {
    throw new InvalidDomainError('serviceId', 'serviceId is required');
  }
  if (Number.isNaN(input.dateTime.getTime())) {
    throw new InvalidDomainError('dateTime', 'dateTime must be a valid date/time');
  }

  return {
    id: randomUUID(),
    customerId: input.customerId,
    barberId: input.barberId,
    serviceId: input.serviceId,
    dateTime: input.dateTime,
    status: AppointmentStatus.PENDING,
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
}

export function transitionAppointment(
  appointment: Appointment,
  to: AppointmentStatus,
  now: Date = new Date()
): Appointment {
  assertCanTransitionAppointment(appointment.status, to);
  return {
    ...appointment,
    status: to,
    updatedAt: now,
  };
}

export function isAppointmentTerminal(appointment: Appointment): boolean {
  return (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  );
}
