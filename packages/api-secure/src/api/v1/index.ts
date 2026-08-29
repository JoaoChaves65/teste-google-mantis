import { Router } from 'express';
import { usersRouter } from './users.routes';
import { customersRouter } from './customers.routes';
import { barbersRouter } from './barbers.routes';
import { servicesRouter } from './services.routes';
import { appointmentsRouter } from './appointments.routes';
import { transactionsRouter } from './transactions.routes';

const router = Router();

router.use('/users', usersRouter);
router.use('/customers', customersRouter);
router.use('/barbers', barbersRouter);
router.use('/services', servicesRouter);
router.use('/appointments', appointmentsRouter);
router.use('/transactions', transactionsRouter);

export const v1Router = router;
