import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import {
  PgAppointmentRepository,
  PgCustomerRepository,
  PgBarberRepository,
  PgServiceRepository,
} from '@barberlab/core/infrastructure';
import {
  CreateAppointment,
  GetAppointment,
  ListAppointments,
  ConfirmAppointment,
  CancelAppointment,
  CompleteAppointment,
} from '@barberlab/core/application';
import { vulnerableAuthMiddleware } from '../../http/middleware/vulnerableAuth';
import { vulnerableRequireRole } from '../../http/middleware/vulnerableRbac';
import { UserRole } from '@barberlab/core';

const router = Router();

const createAppointmentSchema = z.object({
  customerId: z.string().uuid(),
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dateTime: z.string().datetime(),
  notes: z.string().max(1000).optional(),
});

const listAppointmentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const statusActionSchema = z.object({
  action: z.enum(['confirm', 'cancel', 'complete']),
});

router.use(vulnerableAuthMiddleware);

router.get(
  '/',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER, UserRole.CUSTOMER),
  async (req, res) => {
    const parseResult = listAppointmentsSchema.safeParse(req.query);
    if (!parseResult.success) {
      res
        .status(400)
        .json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const appointmentsRepo = new PgAppointmentRepository(executor);
    const listAppointments = new ListAppointments(appointmentsRepo);

    const result = await listAppointments.execute(parseResult.data);
    res.json(result);
  }
);

router.get('/:id', async (req, res) => {
  const parseResult = idParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid appointment ID', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const appointmentsRepo = new PgAppointmentRepository(executor);
  const getAppointment = new GetAppointment(appointmentsRepo);

  const appointment = await getAppointment.execute({ id: parseResult.data.id });
  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  res.json({
    id: appointment.id,
    customerId: appointment.customerId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    dateTime: appointment.dateTime,
    status: appointment.status,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  });
});

router.post('/', async (req, res) => {
  const parseResult = createAppointmentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const appointmentsRepo = new PgAppointmentRepository(executor);
  const customersRepo = new PgCustomerRepository(createSqlExecutor());
  const barbersRepo = new PgBarberRepository(createSqlExecutor());
  const servicesRepo = new PgServiceRepository(createSqlExecutor());
  const createAppointment = new CreateAppointment(
    appointmentsRepo,
    customersRepo,
    barbersRepo,
    servicesRepo
  );

  const input = {
    ...parseResult.data,
    dateTime: new Date(parseResult.data.dateTime),
  };

  const appointment = await createAppointment.execute(input);
  res.status(201).json({
    id: appointment.id,
    customerId: appointment.customerId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    dateTime: appointment.dateTime,
    status: appointment.status,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  });
});

router.patch('/:id/status', async (req, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res
      .status(400)
      .json({ error: 'Invalid appointment ID', details: paramsResult.error.flatten() });
    return;
  }

  const bodyResult = statusActionSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const appointmentsRepo = new PgAppointmentRepository(executor);

  let appointment;
  try {
    if (bodyResult.data.action === 'confirm') {
      const confirmAppointment = new ConfirmAppointment(appointmentsRepo);
      appointment = await confirmAppointment.execute({ id: paramsResult.data.id });
    } else if (bodyResult.data.action === 'cancel') {
      const cancelAppointment = new CancelAppointment(appointmentsRepo);
      appointment = await cancelAppointment.execute({ id: paramsResult.data.id });
    } else if (bodyResult.data.action === 'complete') {
      const completeAppointment = new CompleteAppointment(appointmentsRepo);
      appointment = await completeAppointment.execute({ id: paramsResult.data.id });
    } else {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'InvalidStatusTransitionError') {
      res.status(409).json({ error: error.message });
      return;
    }
    throw error;
  }

  res.json({
    id: appointment.id,
    customerId: appointment.customerId,
    barberId: appointment.barberId,
    serviceId: appointment.serviceId,
    dateTime: appointment.dateTime,
    status: appointment.status,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  });
});

export const appointmentsRouter = router;
