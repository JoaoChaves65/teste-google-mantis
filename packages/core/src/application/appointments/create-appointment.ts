import {
  createAppointment,
  type Appointment,
  type CreateAppointmentInput,
} from '../../domain/appointment';
import { isBarberActive } from '../../domain/barber';
import {
  EntityNotFoundError,
  InactiveBarberError,
  InactiveServiceError,
} from '../../domain/errors';
import { isServiceActive } from '../../domain/service';
import type {
  AppointmentRepository,
  BarberRepository,
  CustomerRepository,
  ServiceRepository,
} from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateAppointment implements Command<CreateAppointmentInput, Appointment> {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly customers: CustomerRepository,
    private readonly barbers: BarberRepository,
    private readonly services: ServiceRepository
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    const customer = await this.customers.findById(input.customerId);
    if (!customer) {
      throw new EntityNotFoundError('Customer', input.customerId);
    }

    const barber = await this.barbers.findById(input.barberId);
    if (!barber) {
      throw new EntityNotFoundError('Barber', input.barberId);
    }
    if (!isBarberActive(barber)) {
      throw new InactiveBarberError(barber.id);
    }

    const service = await this.services.findById(input.serviceId);
    if (!service) {
      throw new EntityNotFoundError('Service', input.serviceId);
    }
    if (!isServiceActive(service)) {
      throw new InactiveServiceError(service.id);
    }

    const appointment = createAppointment(input);
    return this.appointments.create(appointment);
  }
}
