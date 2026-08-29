<!-- KB_SNAPSHOT: snap_20250829_01 -->
# Auth Middleware (Vulnerable)

## Overview
Authentication middleware for the vulnerable API variant. Lacks token revocation checks and account status validation.

## Location
`packages/api-vulnerable/src/http/middleware/vulnerableAuth.ts`

## Implementation
```typescript
export const vulnerableAuthMiddleware = (
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

  // VULNERÁVEL: Não valida se o token está revogado
  // VULNERÁVEL: Não valida se a conta está inativa

  req.user = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
};
```

## Missing Validations

| Missing Check | Impact |
|---------------|--------|
| Token revocation check | Revoked tokens work until expiry |
| Account status check | Inactive/banned users can authenticate |
| Token type validation | Only checks `type !== 'access'` |

## Secure Contrast
See [Secure Auth Middleware](../entities/auth_middleware.md) for secure implementation.

## Associated Vulnerabilities
- [CWE-306: Missing Authentication for Critical Function](../vulnerabilities/CWE-306.md)

---

*Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01*