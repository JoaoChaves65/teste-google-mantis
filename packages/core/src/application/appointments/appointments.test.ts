import { describe, it, expect, beforeEach } from 'vitest';
import { CreateAppointment } from './create-appointment';
import {
  ConfirmAppointment,
  CancelAppointment,
  CompleteAppointment,
} from './change-appointment-status';
import { GetAppointment } from './get-appointment';
import { ListAppointments } from './list-appointments';
import { AppointmentStatus } from '../../domain/appointment';
import { createBarber } from '../../domain/barber';
import { createCustomer } from '../../domain/customer';
import { createService } from '../../domain/service';
import { Money } from '../../domain/money';
import {
  EntityNotFoundError,
  InactiveBarberError,
  InactiveServiceError,
  InvalidStatusTransitionError,
} from '../../domain/errors';
import { InMemoryAppointmentRepository } from '../../persistence/in-memory/appointment-repository';
import { InMemoryBarberRepository } from '../../persistence/in-memory/barber-repository';
import { InMemoryCustomerRepository } from '../../persistence/in-memory/customer-repository';
import { InMemoryServiceRepository } from '../../persistence/in-memory/service-repository';

describe('Appointment use cases', () => {
  let appointments: InMemoryAppointmentRepository;
  let customers: InMemoryCustomerRepository;
  let barbers: InMemoryBarberRepository;
  let services: InMemoryServiceRepository;
  let customerId: string;
  let barberId: string;
  let serviceId: string;

  beforeEach(async () => {
    appointments = new InMemoryAppointmentRepository();
    customers = new InMemoryCustomerRepository();
    barbers = new InMemoryBarberRepository();
    services = new InMemoryServiceRepository();

    customerId = (
      await customers.create(createCustomer({ name: 'Carlos', phone: '(11) 99999-1111' }))
    ).id;
    barberId = (await barbers.create(createBarber({ name: 'João' }))).id;
    serviceId = (
      await services.create(
        createService({ name: 'Corte', price: Money.fromDecimal('50.00'), durationMinutes: 45 })
      )
    ).id;
  });

  const buildUseCase = () => new CreateAppointment(appointments, customers, barbers, services);

  describe('CreateAppointment', () => {
    it('creates a PENDING appointment', async () => {
      const created = await buildUseCase().execute({
        customerId,
        barberId,
        serviceId,
        dateTime: new Date('2026-09-01T14:00:00Z'),
      });
      expect(created.status).toBe(AppointmentStatus.PENDING);
    });

    it('rejects unknown customer', async () => {
      await expect(
        buildUseCase().execute({
          customerId: 'missing',
          barberId,
          serviceId,
          dateTime: new Date(),
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects unknown barber', async () => {
      await expect(
        buildUseCase().execute({
          customerId,
          barberId: 'missing',
          serviceId,
          dateTime: new Date(),
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects inactive barber', async () => {
      await barbers.update({ ...(await barbers.findById(barberId))!, active: false });
      await expect(
        buildUseCase().execute({ customerId, barberId, serviceId, dateTime: new Date() })
      ).rejects.toThrow(InactiveBarberError);
    });

    it('rejects unknown service', async () => {
      await expect(
        buildUseCase().execute({
          customerId,
          barberId,
          serviceId: 'missing',
          dateTime: new Date(),
        })
      ).rejects.toThrow(EntityNotFoundError);
    });

    it('rejects inactive service', async () => {
      await services.update({ ...(await services.findById(serviceId))!, active: false });
      await expect(
        buildUseCase().execute({ customerId, barberId, serviceId, dateTime: new Date() })
      ).rejects.toThrow(InactiveServiceError);
    });
  });

  describe('status transitions', () => {
    const createOne = () =>
      buildUseCase().execute({
        customerId,
        barberId,
        serviceId,
        dateTime: new Date('2026-09-01T14:00:00Z'),
      });

    it('confirms a PENDING appointment', async () => {
      const appointment = await createOne();
      const confirmed = await new ConfirmAppointment(appointments).execute({ id: appointment.id });
      expect(confirmed.status).toBe(AppointmentStatus.CONFIRMED);
    });

    it('cancels a PENDING appointment', async () => {
      const appointment = await createOne();
      const cancelled = await new CancelAppointment(appointments).execute({ id: appointment.id });
      expect(cancelled.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('completes a CONFIRMED appointment', async () => {
      const appointment = await createOne();
      await new ConfirmAppointment(appointments).execute({ id: appointment.id });
      const completed = await new CompleteAppointment(appointments).execute({ id: appointment.id });
      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('rejects completing a PENDING appointment', async () => {
      const appointment = await createOne();
      await expect(
        new CompleteAppointment(appointments).execute({ id: appointment.id })
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('rejects confirming an already-completed appointment', async () => {
      const appointment = await createOne();
      await new ConfirmAppointment(appointments).execute({ id: appointment.id });
      await new CompleteAppointment(appointments).execute({ id: appointment.id });
      await expect(
        new ConfirmAppointment(appointments).execute({ id: appointment.id })
      ).rejects.toThrow(InvalidStatusTransitionError);
    });

    it('rejects transition of an unknown appointment', async () => {
      await expect(new ConfirmAppointment(appointments).execute({ id: 'missing' })).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });

  describe('GetAppointment', () => {
    it('gets an existing appointment', async () => {
      const created = await buildUseCase().execute({
        customerId,
        barberId,
        serviceId,
        dateTime: new Date('2026-09-01T14:00:00Z'),
      });
      const useCase = new GetAppointment(appointments);
      expect((await useCase.execute({ id: created.id }))?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetAppointment(appointments);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListAppointments', () => {
    it('lists appointments with pagination', async () => {
      const useCase = buildUseCase();
      await useCase.execute({ customerId, barberId, serviceId, dateTime: new Date() });
      await useCase.execute({ customerId, barberId, serviceId, dateTime: new Date('2026-09-02') });

      const list = new ListAppointments(appointments);
      const result = await list.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
