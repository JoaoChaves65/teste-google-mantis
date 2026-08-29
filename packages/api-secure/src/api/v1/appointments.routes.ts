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
import { authMiddleware } from '../../http/middleware/auth';
import { requireRole } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import type { UserRole } from '@barberlab/core';

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

router.use(authMiddleware);

async function checkAppointmentAccess(
  req: AuthenticatedRequest,
  appointmentId: string
): Promise<{
  allowed: boolean;
  appointment?: { customerId: string; barberId: string };
  notFound?: boolean;
}> {
  const executor = createSqlExecutor();
  const appointmentsRepo = new PgAppointmentRepository(executor);
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    return { allowed: false, notFound: true };
  }

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') {
    return { allowed: true, appointment };
  }

  if (userRole === 'CUSTOMER' && appointment.customerId === userId) {
    return { allowed: true, appointment };
  }

  if (userRole === 'BARBER') {
    const { PgBarberRepository: BarbersRepo } = await import('@barberlab/core/infrastructure');
    const barbersRepo = new BarbersRepo(executor);
    const barber = await barbersRepo.findByUserId(userId);
    if (!barber) {
      return { allowed: false };
    }
    return { allowed: appointment.barberId === barber.id, appointment };
  }

  return { allowed: false };
}

router.post(
  '/',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = createAppointmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    if (userRole === 'CUSTOMER' && parseResult.data.customerId !== userId) {
      res.status(403).json({ error: 'Cannot create appointment for another customer' });
      return;
    }

    const executor = createSqlExecutor();
    const appointmentsRepo = new PgAppointmentRepository(executor);
    const customersRepo = new PgCustomerRepository(executor);
    const barbersRepo = new PgBarberRepository(executor);
    const servicesRepo = new PgServiceRepository(executor);
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
  }
);

router.get(
  '/',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
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

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    const result = await listAppointments.execute(parseResult.data);

    if (userRole === 'CUSTOMER') {
      // Find the customer ID for this user
      const { PgCustomerRepository: CustomersRepo } =
        await import('@barberlab/core/infrastructure');
      const customersRepo = new CustomersRepo(executor);
      const customer = await customersRepo.findByUserId(userId);
      if (customer) {
        result.data = result.data.filter(a => a.customerId === customer.id);
      } else {
        result.data = [];
      }
    } else if (userRole === 'BARBER') {
      // Find the barber ID for this user
      const { PgBarberRepository: BarbersRepo } = await import('@barberlab/core/infrastructure');
      const barbersRepo = new BarbersRepo(executor);
      const barber = await barbersRepo.findByUserId(userId);
      if (barber) {
        result.data = result.data.filter(a => a.barberId === barber.id);
      } else {
        result.data = [];
      }
    }

    if (parseResult.data.status) {
      result.data = result.data.filter(a => a.status === parseResult.data.status);
    }

    res.json(result);
  }
);

router.get(
  '/:id',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = idParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      res
        .status(400)
        .json({ error: 'Invalid appointment ID', details: parseResult.error.flatten() });
      return;
    }

    const access = await checkAppointmentAccess(req, parseResult.data.id);
    if (access.notFound) {
      throw AppError.notFound('Appointment', parseResult.data.id);
    }
    if (!access.allowed || !access.appointment) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const executor = createSqlExecutor();
    const appointmentsRepo = new PgAppointmentRepository(executor);
    const getAppointment = new GetAppointment(appointmentsRepo);

    const appointment = await getAppointment.execute({ id: parseResult.data.id });
    if (!appointment) {
      throw AppError.notFound('Appointment', parseResult.data.id);
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
  }
);

router.patch(
  '/:id/status',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
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

    const access = await checkAppointmentAccess(req, paramsResult.data.id);
    if (access.notFound) {
      throw AppError.notFound('Appointment', paramsResult.data.id);
    }
    if (!access.allowed || !access.appointment) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    if (userRole === 'CUSTOMER') {
      if (bodyResult.data.action !== 'cancel') {
        res.status(403).json({ error: 'Customers can only cancel appointments' });
        return;
      }
      if (access.appointment.customerId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    if (userRole === 'BARBER') {
      if (bodyResult.data.action !== 'confirm' && bodyResult.data.action !== 'complete') {
        res.status(403).json({ error: 'Barbers can only confirm or complete appointments' });
        return;
      }
      if (access.appointment.barberId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
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
  }
);

export const appointmentsRouter = router;
