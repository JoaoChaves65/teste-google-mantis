<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Appointment Entity

## Overview

Core domain entity representing a booking linking Customer, Barber, and Service.

## Definition

```typescript
// packages/core/src/domain/appointment.ts
export interface Appointment {
  id: string; // UUID v4
  customerId: string; // FK → Customer
  barberId: string; // FK → Barber
  serviceId: string; // FK → Service
  dateTime: Date; // appointment date/time
  status: AppointmentStatus; // PENDING | CONFIRMED | COMPLETED | CANCELLED
  notes: string | null; // max 1000 chars
  createdAt: Date;
  updatedAt: Date;
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
```

## Status Transition Rules (Invariant)

```
PENDING    → CONFIRMED (barber/admin)
PENDING    → CANCELLED (customer/barber/admin)
CONFIRMED  → COMPLETED (barber/admin)
CONFIRMED  → CANCELLED (customer/barber/admin)
COMPLETED  → (terminal)
CANCELLED  → (terminal)
```

Invalid transitions throw `InvalidStatusTransitionError`.

## Repository Interface

```typescript
interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>>;
  create(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<Appointment>;
  delete(id: string): Promise<void>;
}
```

## Secure vs Vulnerable Behavior

| Aspect                | Secure (`api-secure`)      | Vulnerable (`api-vulnerable`) |
| --------------------- | -------------------------- | ----------------------------- |
| **Ownership Check**   | `checkAppointmentAccess()` | **None**                      |
| **Status Transition** | Validated via domain       | Same (domain enforced)        |
| **Listing**           | Filtered by ownership/role | No filtering (all visible)    |

## Associated Vulnerabilities

| Vulnerability      | CWE     | Severity | Files                                                                 |
| ------------------ | ------- | -------- | --------------------------------------------------------------------- |
| IDOR (Appointment) | CWE-639 | HIGH     | `appointments.routes.ts` (vulnerable) GET `/:id`, PATCH `/:id/status` |
| Broken RBAC        | CWE-285 | HIGH     | Missing `checkAppointmentAccess` in vulnerable                        |

## Status Transition Logic

```typescript
// packages/core/src/application/appointments/change-appointment-status.ts
async execute(input: { id: string; action: 'confirm' | 'cancel' | 'complete' }): Promise<Appointment> {
  const appointment = await this.appointments.findById(input.id);
  if (!appointment) throw new EntityNotFoundError('Appointment', input.id);

  // Validate transition
  const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (!validTransitions[appointment.status].includes(action)) {
    throw new InvalidStatusTransitionError(appointment.status, action);
  }

  // Apply transition
  return this.appointments.update({ ...appointment, status: action, updatedAt: new Date() });
}
```

## Use Cases

- `CreateAppointment`: creates PENDING, validates barber/service exist, active
- `GetAppointment`: returns by ID (secure: ownership check)
- `ListAppointments`: filtered by role/ownership (secure), all (vulnerable)
- `ConfirmAppointment`: PENDING → CONFIRMED (barber/admin)
- `CancelAppointment`: PENDING/CONFIRMED → CANCELLED (owner/barber/admin)
- `CompleteAppointment`: CONFIRMED → COMPLETED (barber/admin)

## Related Components

- [Appointment Routes (Vulnerable)](../entities/appointment_routes_vulnerable.md)
- [Appointment Routes (Secure)](../entities/appointment_routes_secure.md)
- [Appointment Repository](../entities/appointment_repository.md)
- [VulnerableAppointmentRepository](../entities/vulnerable_appointment_repository.md)

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
