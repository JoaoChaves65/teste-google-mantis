import { describe, it, expect, beforeEach } from 'vitest';
import { JwtTokenService } from './token-service';

describe('JwtTokenService', () => {
  let tokenService: JwtTokenService;

  beforeEach(() => {
    tokenService = new JwtTokenService();
  });

  const validPayload = {
    sub: 'user-1',
    email: 'test@barberlab.local',
    role: 'CUSTOMER',
  };

  describe('generateAccessToken', () => {
    it('generates a valid access token with jti claim', () => {
      const token = tokenService.generateAccessToken(validPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('includes jti claim', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.jti).toBeDefined();
      expect(typeof payload.jti).toBe('string');
      expect(payload.jti.length).toBeGreaterThan(0);
    });

    it('includes correct type claim', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.type).toBe('access');
    });

    it('includes correct sub, email, role', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.sub).toBe('user-1');
      expect(payload.email).toBe('test@barberlab.local');
      expect(payload.role).toBe('CUSTOMER');
    });

    it('includes exp and iat claims', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(typeof payload.exp).toBe('number');
      expect(typeof payload.iat).toBe('number');
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });
  });

  describe('generateRefreshToken', () => {
    it('generates a valid refresh token with jti claim', () => {
      const token = tokenService.generateRefreshToken(validPayload);
      expect(token).toBeDefined();
      expect(token.split('.').length).toBe(3);
    });

    it('includes jti claim', () => {
      const token = tokenService.generateRefreshToken(validPayload);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.jti).toBeDefined();
    });

    it('includes type refresh claim', () => {
      const token = tokenService.generateRefreshToken(validPayload);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('verifies a valid access token', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const payload = tokenService.verifyAccessToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user-1');
      expect(payload?.type).toBe('access');
    });

    it('rejects tampered payload', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const parts = token.split('.');
      const tamperedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      tamperedPayload.sub = 'user-2';
      const tamperedToken =
        parts[0] +
        '.' +
        Buffer.from(JSON.stringify(tamperedPayload)).toString('base64') +
        '.' +
        parts[2];

      const result = tokenService.verifyAccessToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('rejects tampered signature', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const parts = token.split('.');
      const tamperedToken = parts[0] + '.' + parts[1] + '.invalidsignature';

      const result = tokenService.verifyAccessToken(tamperedToken);
      expect(result).toBeNull();
    });

    it('rejects alg=none attack', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
      const payload = Buffer.from(JSON.stringify({ ...validPayload, type: 'access' })).toString(
        'base64'
      );
      const noneToken = header + '.' + payload + '.';

      const result = tokenService.verifyAccessToken(noneToken);
      expect(result).toBeNull();
    });

    it('rejects algorithm confusion attack (RS256 vs HS256)', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const result = tokenService.verifyAccessToken(token);
      expect(result).not.toBeNull();
    });

    it('rejects token with invalid type', () => {
      const token = tokenService.generateRefreshToken(validPayload);
      const result = tokenService.verifyAccessToken(token);
      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('verifies a valid refresh token', () => {
      const token = tokenService.generateRefreshToken(validPayload);
      const payload = tokenService.verifyRefreshToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.type).toBe('refresh');
    });

    it('rejects access token as refresh token', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const result = tokenService.verifyRefreshToken(token);
      expect(result).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('generates both access and refresh tokens', () => {
      const pair = tokenService.generateTokenPair(validPayload);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();
      expect(pair.accessTokenExpiresAt).toBeInstanceOf(Date);
      expect(pair.refreshTokenExpiresAt).toBeInstanceOf(Date);
      expect(pair.accessTokenExpiresAt.getTime()).toBeLessThan(
        pair.refreshTokenExpiresAt.getTime()
      );
    });
  });

  describe('decodeToken', () => {
    it('decodes without verification', () => {
      const token = tokenService.generateAccessToken(validPayload);
      const payload = tokenService.decodeToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user-1');
    });
  });
});
