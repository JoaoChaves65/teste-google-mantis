import { describe, it, expect } from 'vitest';
import {
  createAppointment,
  transitionAppointment,
  canTransitionAppointment,
  isAppointmentTerminal,
  AppointmentStatus,
  APPOINTMENT_STATUSES,
} from './appointment';
import { InvalidDomainError, InvalidStatusTransitionError } from './errors';

const baseInput = {
  customerId: 'customer-1',
  barberId: 'barber-1',
  serviceId: 'service-1',
  dateTime: new Date('2026-09-01T14:00:00Z'),
};

describe('Appointment domain', () => {
  it('creates a valid PENDING appointment', () => {
    const appointment = createAppointment(baseInput);
    expect(appointment.status).toBe(AppointmentStatus.PENDING);
    expect(appointment.customerId).toBe('customer-1');
    expect(appointment.barberId).toBe('barber-1');
    expect(appointment.serviceId).toBe('service-1');
    expect(appointment.dateTime).toEqual(baseInput.dateTime);
  });

  describe('required fields', () => {
    it('requires customer', () => {
      expect(() => createAppointment({ ...baseInput, customerId: '' })).toThrow(InvalidDomainError);
    });

    it('requires barber', () => {
      expect(() => createAppointment({ ...baseInput, barberId: '' })).toThrow(InvalidDomainError);
    });

    it('requires service', () => {
      expect(() => createAppointment({ ...baseInput, serviceId: '' })).toThrow(InvalidDomainError);
    });

    it('requires a valid date_time', () => {
      expect(() => createAppointment({ ...baseInput, dateTime: new Date('nope') })).toThrow(
        InvalidDomainError
      );
    });
  });

  describe('canTransitionAppointment', () => {
    it('allows PENDING -> CONFIRMED and PENDING -> CANCELLED', () => {
      expect(canTransitionAppointment(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED)).toBe(
        true
      );
      expect(canTransitionAppointment(AppointmentStatus.PENDING, AppointmentStatus.CANCELLED)).toBe(
        true
      );
    });

    it('allows CONFIRMED -> COMPLETED and CONFIRMED -> CANCELLED', () => {
      expect(
        canTransitionAppointment(AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED)
      ).toBe(true);
      expect(
        canTransitionAppointment(AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED)
      ).toBe(true);
    });

    it('disallows PENDING -> COMPLETED', () => {
      expect(canTransitionAppointment(AppointmentStatus.PENDING, AppointmentStatus.COMPLETED)).toBe(
        false
      );
    });

    it('disallows COMPLETED -> anything', () => {
      for (const to of APPOINTMENT_STATUSES) {
        expect(canTransitionAppointment(AppointmentStatus.COMPLETED, to)).toBe(false);
      }
    });

    it('disallows CANCELLED -> anything', () => {
      for (const to of APPOINTMENT_STATUSES) {
        expect(canTransitionAppointment(AppointmentStatus.CANCELLED, to)).toBe(false);
      }
    });
  });

  describe('valid transitions', () => {
    it('PENDING -> CONFIRMED', () => {
      const appointment = createAppointment(baseInput);
      const updated = transitionAppointment(appointment, AppointmentStatus.CONFIRMED);
      expect(updated.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('PENDING -> CANCELLED', () => {
      const appointment = createAppointment(baseInput);
      expect(transitionAppointment(appointment, AppointmentStatus.CANCELLED).status).toBe(
        AppointmentStatus.CANCELLED
      );
    });

    it('CONFIRMED -> COMPLETED', () => {
      const appointment = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CONFIRMED
      );
      expect(transitionAppointment(appointment, AppointmentStatus.COMPLETED).status).toBe(
        AppointmentStatus.COMPLETED
      );
    });

    it('CONFIRMED -> CANCELLED', () => {
      const appointment = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CONFIRMED
      );
      expect(transitionAppointment(appointment, AppointmentStatus.CANCELLED).status).toBe(
        AppointmentStatus.CANCELLED
      );
    });
  });

  describe('invalid transitions', () => {
    it('rejects PENDING -> COMPLETED', () => {
      const appointment = createAppointment(baseInput);
      expect(() => transitionAppointment(appointment, AppointmentStatus.COMPLETED)).toThrow(
        InvalidStatusTransitionError
      );
    });

    it('rejects COMPLETED -> PENDING (cannot go back)', () => {
      const appointment = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CONFIRMED
      );
      const completed = transitionAppointment(appointment, AppointmentStatus.COMPLETED);
      expect(() => transitionAppointment(completed, AppointmentStatus.PENDING)).toThrow(
        InvalidStatusTransitionError
      );
    });

    it('rejects COMPLETED -> CANCELLED', () => {
      const appointment = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CONFIRMED
      );
      const completed = transitionAppointment(appointment, AppointmentStatus.COMPLETED);
      expect(() => transitionAppointment(completed, AppointmentStatus.CANCELLED)).toThrow(
        InvalidStatusTransitionError
      );
    });

    it('rejects CANCELLED -> CONFIRMED (cannot undo cancellation)', () => {
      const appointment = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CANCELLED
      );
      expect(() => transitionAppointment(appointment, AppointmentStatus.CONFIRMED)).toThrow(
        InvalidStatusTransitionError
      );
    });

    it('rejects transition to the same status', () => {
      const appointment = createAppointment(baseInput);
      expect(() => transitionAppointment(appointment, AppointmentStatus.PENDING)).toThrow(
        InvalidStatusTransitionError
      );
    });
  });

  describe('terminal states', () => {
    it('marks COMPLETED and CANCELLED as terminal', () => {
      const confirmed = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CONFIRMED
      );
      expect(
        isAppointmentTerminal(transitionAppointment(confirmed, AppointmentStatus.COMPLETED))
      ).toBe(true);
      expect(
        isAppointmentTerminal(transitionAppointment(confirmed, AppointmentStatus.CANCELLED))
      ).toBe(true);
    });

    it('marks PENDING and CONFIRMED as non-terminal', () => {
      expect(isAppointmentTerminal(createAppointment(baseInput))).toBe(false);
      const confirmed = transitionAppointment(
        createAppointment(baseInput),
        AppointmentStatus.CONFIRMED
      );
      expect(isAppointmentTerminal(confirmed)).toBe(false);
    });
  });
});
