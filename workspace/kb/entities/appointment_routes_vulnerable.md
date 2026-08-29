<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Appointment Routes (Vulnerable)

## Overview

Appointment management routes in the vulnerable API variant. Contains IDOR
vulnerabilities.

## Location

`packages/api-vulnerable/src/api/v1/appointments.routes.ts`

## Endpoints

| Method | Path                       | Auth                    | Vulnerabilities               |
| ------ | -------------------------- | ----------------------- | ----------------------------- |
| GET    | `/appointments`            | ADMIN, BARBER, CUSTOMER | No ownership filtering        |
| GET    | `/appointments/:id`        | All authenticated       | **IDOR** — no ownership check |
| POST   | `/appointments`            | All authenticated       | No ownership validation       |
| PATCH  | `/appointments/:id/status` | All authenticated       | **IDOR** — no ownership check |

## Vulnerable Code Patterns

### IDOR (Lines 69-97)

```typescript
router.get('/:id', async (req, res) => {
  const appointment = await getAppointment.execute({ id: parseResult.data.id });
  // NO ownership check — any authenticated user can access any appointment
  res.json({ ...appointment });
});
```

### Status Update IDOR (Lines 137-189)

```typescript
router.patch('/:id/status', async (req, res) => {
  const appointment = await cancelAppointment.execute({
    id: paramsResult.data.id,
  });
  // Customer can cancel OTHER customers' appointments
});
```

## Secure Contrast

See [Appointment Routes (Secure)](appointment_routes_secure.md) for secure
implementation.

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
