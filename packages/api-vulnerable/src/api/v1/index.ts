import { Router } from 'express';
import { customersRouter } from './customers.routes';
import { barbersRouter } from './barbers.routes';
import { servicesRouter } from './services.routes';
import { appointmentsRouter } from './appointments.routes';
import { transactionsRouter } from './transactions.routes';
import { usersRouter } from './users.routes';

const router = Router();

router.use('/customers', customersRouter);
router.use('/barbers', barbersRouter);
router.use('/services', servicesRouter);
router.use('/appointments', appointmentsRouter);
router.use('/transactions', transactionsRouter);
router.use('/users', usersRouter);

export const v1Router = router;
