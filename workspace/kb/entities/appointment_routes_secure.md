<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Appointment Routes (Secure)

## Overview

Appointment management routes in the secure API variant. Implements proper
ownership checks.

## Location

`packages/api-secure/src/api/v1/appointments.routes.ts`

## Endpoints

| Method | Path                       | Auth                    | Protection                                     |
| ------ | -------------------------- | ----------------------- | ---------------------------------------------- |
| GET    | `/appointments`            | ADMIN, BARBER, CUSTOMER | Role-based filtering                           |
| GET    | `/appointments/:id`        | ADMIN, BARBER, CUSTOMER | `checkAppointmentAccess` ownership             |
| POST   | `/appointments`            | ADMIN, BARBER, CUSTOMER | Ownership validation on create                 |
| PATCH  | `/appointments/:id/status` | ADMIN, BARBER, CUSTOMER | Ownership check + status transition validation |

## Secure Patterns

### Ownership Check (Lines 51-90)

```typescript
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
  if (!appointment) return { allowed: false, notFound: true };

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') return { allowed: true, appointment };
  if (userRole === 'CUSTOMER' && appointment.customerId === userId)
    return { allowed: true, appointment };
  if (userRole === 'BARBER' && appointment.barberId === userId)
    return { allowed: true, appointment };
  return { allowed: false };
}
```

### Status Transition Validation

```typescript
const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// Handler validates transition before applying
```

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
