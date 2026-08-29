<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Threat Model — BarberLab Security Lab

## System Overview Summary

BarberLab is a monorepo-based barbershop management system with **dual-API
architecture**:

- **`@barberlab/api-secure`** (port 3001): Production-ready API with full
  security controls
- **`@barberlab/api-vulnerable`** (port 3002): Intentionally vulnerable API for
  security training/labs
- **`@barberlab/core`**: Shared domain, application logic, persistence
  interfaces, and infrastructure
- **`@barberlab/web`** (port 5173): React + Vite frontend consuming the secure
  API

Both APIs share the **same core domain logic** (`@barberlab/core`) but implement
**different security postures** at the HTTP/presentation layer.

---

## Deployment Intent

**Intent: SAMPLE_OR_TEST_ONLY**

This system is an educational Security Lab. The vulnerable API variant
(`api-vulnerable`) is intentionally designed with security weaknesses for
training purposes. The secure variant (`api-secure`) demonstrates proper
security controls.

**PRODUCTION-SIGNAL CHECKLIST — all FALSE:**

1. ✅ NO entity is classified CRITICAL or STANDARD availability
2. ✅ architecture.md names NO externally-reachable production service/daemon
3. ✅ The KB describes NO installable/publishable package or runtime entrypoint
4. ✅ EVERY component/path lies under test/sample directories
5. ✅ NO entity documents a real untrusted external input crossing into
   privileged logic

---

## Trust Boundaries

| Boundary                          | Components                                                | Validation                                                  |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| **Public Internet → API Gateway** | Web UI, API endpoints                                     | UNTRUSTED                                                   |
| **API Gateway → Auth Layer**      | JWT validation, Helmet, CORS, Rate Limiting               | SEMI-TRUSTED                                                |
| **Auth Layer → Application**      | JWT validation, token revocation (secure), account status | TRUSTED                                                     |
| **Application → Domain**          | Use Cases → Entities                                      | Domain factories, invariants                                |
| **Domain → Persistence**          | Entities → Repositories                                   | Interface contracts, mapping                                |
| **Persistence → DB**              | Repositories → PostgreSQL                                 | Parameterized queries (secure) / string concat (vulnerable) |

---

## Attacker Profiles & Vectors

### Attacker Profiles

| Profile                              | Description                      | Capabilities                                                       |
| ------------------------------------ | -------------------------------- | ------------------------------------------------------------------ |
| **Unauthenticated Network Attacker** | No credentials                   | Can probe public endpoints, attempt SQLi via vulnerable repo       |
| **Authenticated Customer**           | Valid JWT, role=CUSTOMER         | Can access own resources, attempt IDOR, mass assignment            |
| **Authenticated Barber**             | Valid JWT, role=BARBER           | Can access own resources, attempt admin endpoints, mass assignment |
| **Authenticated Admin**              | Valid JWT, role=ADMIN            | Full access (legitimate)                                           |
| **Malicious Insider**                | Valid credentials, elevated role | Can exploit all vulnerabilities                                    |

### Attack Vectors by Vulnerability Class

| CWE     | Vulnerability           | Entry Point                                   | Attacker Profile              |
| ------- | ----------------------- | --------------------------------------------- | ----------------------------- |
| CWE-89  | SQL Injection           | `VulnerableAppointmentRepository` methods     | Authenticated user (any role) |
| CWE-639 | IDOR                    | `GET/PATCH /api/v1/*/:id` (vulnerable routes) | Authenticated Customer/Barber |
| CWE-915 | Mass Assignment         | `POST/PATCH /api/v1/*` (vulnerable routes)    | Authenticated Customer/Barber |
| CWE-200 | Sensitive Data Exposure | `GET /api/v1/users`, `/auth/login`            | Authenticated user            |
| CWE-285 | Broken RBAC             | Admin endpoints without proper RBAC           | Authenticated Customer/Barber |
| CWE-306 | Missing Auth Checks     | Auth middleware (vulnerable)                  | Any authenticated user        |
| CWE-200 | Sensitive Data Exposure | `GET /users`, `/auth/login`                   | Authenticated user            |

---

## High-Risk Assets

| Asset                            | Tier            | Rationale                                       |
| -------------------------------- | --------------- | ----------------------------------------------- |
| **User.passwordHash** (Argon2id) | CRITICAL        | Offline cracking enables full account takeover  |
| **Refresh Tokens**               | CRITICAL        | Persistent access if stolen                     |
| **User.role (ADMIN)**            | CRITICAL        | Privilege escalation via mass assignment        |
| **Appointment Data**             | STANDARD        | PII exposure via IDOR                           |
| **Customer PII**                 | STANDARD        | Name, phone, email, birthDate exposure via IDOR |
| **Financial Transactions**       | STANDARD        | Financial data exposure via IDOR                |
| **Barber Availability (active)** | LOW_CRITICALITY | Availability manipulation via mass assignment   |

---

## Threat Actors & Vectors

| Threat Actor               | Motivation                       | Primary Vectors                                                  |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------- |
| **Opportunistic Attacker** | Credential theft, data theft     | SQLi (CWE-89), IDOR (CWE-639), Credential stuffing               |
| **Malicious Customer**     | Data theft, privilege escalation | IDOR (CWE-639), Mass Assignment (CWE-915), RBAC bypass (CWE-285) |
| **Malicious Barber**       | Data theft, privilege escalation | IDOR (CWE-639), RBAC bypass (CWE-285), Mass Assignment (CWE-915) |
| **Insider Threat**         | Data exfiltration, sabotage      | All vectors (legitimate access)                                  |
| **Credential Stuffer**     | Account takeover                 | Credential stuffing + broken auth (CWE-306)                      |

---

## High-Risk Attack Scenarios

### 1. SQL Injection → Full Appointment Data Exfiltration

**Vector:**
`VulnerableAppointmentRepository.findByCustomerId('1\' OR \'1\'=\'1 --')`  
**Impact:** Exfiltrate all appointments across all customers/barbers  
**CVSS:** 9.8 (CRITICAL)  
**Mitigation:** Parameterized queries in `PgAppointmentRepository`

### 2. IDOR → Cross-Customer Data Access

**Vector:** `GET /api/v1/customers/{other_customer_id}` as authenticated
Customer  
**Impact:** Full PII exposure (name, phone, email, birthDate, notes)  
**CVSS:** 8.1 (HIGH)  
**Mitigation:** Ownership checks in `checkCustomerAccess` middleware

### 3. Mass Assignment → Privilege Escalation

**Vector:** `POST /api/v1/users { role: "ADMIN" }` as authenticated Customer  
**Impact:** Privilege escalation to ADMIN  
**CVSS:** 9.8 (CRITICAL)  
**Mitigation:** Schema excludes `role` field; server-side role assignment

### 4. Broken RBAC → Admin Endpoint Access

**Vector:** Customer accesses `GET /api/v1/users` (admin only)  
**Impact:** Full user list enumeration including passwordHash  
**CVSS:** 8.1 (HIGH)  
**Mitigation:** `requireAdmin` middleware on all admin routes

### 5. Sensitive Data Exposure → Credential Theft

**Vector:** `GET /api/v1/users` returns `passwordHash` (Argon2id)  
**Impact:** Offline password cracking (GPU: ~10k H/s)  
**CVSS:** 9.1 (CRITICAL)  
**Mitigation:** Never serialize `passwordHash` in responses

### 6. Excessive Error Disclosure → Reconnaissance

**Vector:** Trigger 500 errors to leak stack traces/SQL  
**Impact:** Information leakage for reconnaissance  
**CVSS:** 5.3 (MEDIUM)  
**Mitigation:** Sanitized error handler in secure variant

---

## Security Controls Matrix

| Control                    | api-secure                             | api-vulnerable                       | Gap      |
| -------------------------- | -------------------------------------- | ------------------------------------ | -------- |
| Parameterized Queries      | ✅                                     | ❌ (VulnerableAppointmentRepository) | CRITICAL |
| Ownership Checks           | ✅ (checkCustomerAccess, etc.)         | ❌                                   | HIGH     |
| RBAC Enforcement           | ✅ (requireAdmin, requireRole)         | ❌ (missing on routes)               | CRITICAL |
| Mass Assignment Protection | ✅ (schemas exclude privileged fields) | ❌ (schemas include role/active)     | HIGH     |
| Sensitive Data Filtering   | ✅ (passwordHash excluded)             | ❌ (exposed in /users)               | CRITICAL |
| Error Sanitization         | ✅ (no stack traces)                   | ❌ (stack traces exposed)            | MEDIUM   |
| Token Revocation Check     | ✅ (RefreshTokenRepository)            | ❌                                   | MEDIUM   |
| Account Status Check       | ✅ (ACTIVE check)                      | ❌                                   | MEDIUM   |
| HttpOnly Cookies (Refresh) | ✅                                     | ❌ (in body)                         | MEDIUM   |
| Rate Limiting              | ✅ (both)                              | ✅                                   | —        |

---

## Secure Contrast Summary

| Vulnerability           | api-vulnerable Behavior           | api-secure Behavior           | CVSS Gap  |
| ----------------------- | --------------------------------- | ----------------------------- | --------- |
| SQL Injection           | Returns all appointments          | Parameterized queries block   | 9.8 → 0.0 |
| IDOR                    | Cross-customer access allowed     | Ownership checks enforce 403  | 8.1 → 0.0 |
| Mass Assignment (role)  | Accepts role=ADMIN                | Schema rejects role field     | 9.8 → 0.0 |
| Broken RBAC             | Customer accesses admin endpoints | requireAdmin blocks with 403  | 8.1 → 0.0 |
| Sensitive Data Exposure | passwordHash in responses         | passwordHash never serialized | 9.1 → 0.0 |
| Error Disclosure        | Stack traces, SQL in responses    | Sanitized errors only         | 5.3 → 0.0 |

---

## Deployment Intent Verdict

**Intent: SAMPLE_OR_TEST_ONLY**

This is a Security Lab for educational purposes. The vulnerable variant exists
solely for controlled security training. The secure variant demonstrates proper
mitigations.

---

## Threat Model Summary

| Metric                               | Value                                                         |
| ------------------------------------ | ------------------------------------------------------------- |
| **Total Vulnerabilities Identified** | 18 (learnings.jsonl)                                          |
| **Critical Vulnerabilities**         | 4 (VULN-001, VULN-005, VULN-008, VULN-001)                    |
| **High Severity**                    | 9                                                             |
| **Medium Severity**                  | 4                                                             |
| **Secure Contrast Coverage**         | 100% (all 6 vulnerability classes have secure contrast tests) |
| **Test Coverage**                    | 68 tests passing (31 vulnerable + 29 secure contrast)         |
| **Deployment Intent**                | SAMPLE_OR_TEST_ONLY                                           |

---

_Threat Model generated by Mantis Threat Modeler — KB_SNAPSHOT:
snap_20250829_01_
