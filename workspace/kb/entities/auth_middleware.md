<!-- KB_SNAPSHOT: snap_20250829_01 -->
# Secure Auth Middleware

## Overview
Authentication middleware for the secure API variant. Validates JWT, checks token revocation, and verifies account status.

## Location
`packages/api-secure/src/http/middleware/auth.ts`

## Implementation
```typescript
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const payload = createTokenService().verifyAccessToken(token);

  if (!payload) {
    const decoded = createTokenService().decodeToken(token);
    if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
      res.status(401).json({ error: 'Access token has expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid access token' });
    return;
  }

  if (payload.type !== 'access') {
    res.status(401).json({ error: 'Token is not an access token' });
    return;
  }

  // Token revocation check is performed in LoginCommand/RefreshTokenCommand
  // via RefreshTokenRepository (token hash lookup + revokedAt check)

  req.user = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};
```

## Security Controls

| Control | Implementation |
|---------|----------------|
| JWT Validation | `verifyAccessToken()` with signature + expiry check |
| Token Revocation | Checked in `LoginCommand`/`RefreshTokenCommand` via `RefreshTokenRepository` |
| Account Status | Checked during login/refresh via `UserStatus.ACTIVE` check |
| Token Type | Enforces `type === 'access'` |
| Expiry Handling | Returns 401 with `TokenExpiredError` code |
| Refresh Rotation | Generates new pair, revokes old refresh token |
| Cookie Security | `HttpOnly`, `Secure` (prod), `SameSite=Lax` (dev) / `Strict` (prod) |

## Associated Vulnerabilities
- [CWE-306: Missing Authentication for Critical Function](../vulnerabilities/CWE-306.md)

---

*Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01*