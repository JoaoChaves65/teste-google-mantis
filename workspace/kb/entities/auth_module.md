<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Auth Module

## Overview

Authentication and authorization middleware for both API variants. Handles JWT
validation, token refresh, and role-based access control.

## Component Details

| Aspect          | Detail                                                                                 |
| --------------- | -------------------------------------------------------------------------------------- |
| **Name**        | Auth Module                                                                            |
| **Type**        | Middleware + HTTP Routes                                                               |
| **Criticality** | CRITICAL                                                                               |
| **Location**    | `packages/api-vulnerable/src/auth/`, `packages/api-secure/src/http/middleware/auth.ts` |

## Public Interfaces

| Method | Endpoint        | Description                                       |
| ------ | --------------- | ------------------------------------------------- |
| POST   | `/auth/login`   | Authenticate user, return access + refresh tokens |
| POST   | `/auth/refresh` | Rotate refresh token, issue new access token      |
| POST   | `/auth/logout`  | Revoke refresh token, clear cookie                |
| GET    | `/auth/me`      | Get current user profile from access token        |

## Security Controls

### Secure Implementation (`api-secure`)

| Control          | Implementation                                                      |
| ---------------- | ------------------------------------------------------------------- |
| JWT Validation   | `verifyAccessToken()` with signature + expiry check                 |
| Token Revocation | Checks `PgRefreshTokenRepository` for revoked tokens                |
| Account Status   | Verifies `user.status === 'ACTIVE'`                                 |
| Token Type       | Enforces `type === 'access'`                                        |
| Expiry Handling  | Returns 401 with `TokenExpiredError` code                           |
| Refresh Rotation | Generates new pair, revokes old refresh token                       |
| Cookie Security  | `HttpOnly`, `Secure` (prod), `SameSite=Lax` (dev) / `Strict` (prod) |

### Vulnerable Implementation (`api-vulnerable`)

| Weakness                  | Impact                                   |
| ------------------------- | ---------------------------------------- |
| No revocation check       | Revoked tokens still work until expiry   |
| No inactive account check | Inactive users can still authenticate    |
| No token type validation  | Refresh tokens accepted as access tokens |
| No account lockout        | Brute force feasible (rate limit only)   |

## Associated Vulnerabilities

| Vulnerability             | CWE     | Files               |
| ------------------------- | ------- | ------------------- |
| Broken Authentication     | CWE-287 | `vulnerableAuth.ts` |
| Broken Role Authorization | CWE-285 | `vulnerableRbac.ts` |
| Missing Token Revocation  | CWE-613 | `vulnerableAuth.ts` |

## Related Entities

- [User Entity](../entities/user_entity.md)
- [Auth Middleware](../entities/auth_middleware.md)
- [RBAC Module](../entities/rbac_module.md)

## Trajectory Insights

- **ETAPA 12**: 3 pre-existing test failures in api-secure (SameSite, rate
  limiting) unrelated to vulnerabilities
- **ETAPA 10**: api-vulnerable auth lacks revocation check → token theft impact
  amplified
- **ETAPA 12**: Rate limiting test expects 429 but gets 400/401 → implementation
  gap

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
