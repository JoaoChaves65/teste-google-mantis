import jwt from 'jsonwebtoken';
import type { JwtPayload, TokenPair } from './auth';
import { getEnv } from '../config/env';
import { generateJti } from './auth';

export interface TokenService {
  generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
  generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string;
  generateTokenPair(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): TokenPair;
  verifyAccessToken(token: string): JwtPayload | null;
  verifyRefreshToken(token: string): JwtPayload | null;
  decodeToken(token: string): JwtPayload | null;
}

export class JwtTokenService implements TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor() {
    const env = getEnv();
    this.accessSecret = env.JWT_ACCESS_SECRET;
    this.refreshSecret = env.JWT_REFRESH_SECRET;
    this.accessExpiry = env.JWT_ACCESS_EXPIRY;
    this.refreshExpiry = env.JWT_REFRESH_EXPIRY;
  }

  generateAccessToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign({ ...payload, type: 'access', jti: generateJti() }, this.accessSecret, {
      expiresIn: this.accessExpiry as jwt.SignOptions['expiresIn'],
    });
  }

  generateRefreshToken(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): string {
    return jwt.sign({ ...payload, type: 'refresh', jti: generateJti() }, this.refreshSecret, {
      expiresIn: this.refreshExpiry as jwt.SignOptions['expiresIn'],
    });
  }

  generateTokenPair(payload: Omit<JwtPayload, 'type' | 'iat' | 'exp'>): TokenPair {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    const accessDecoded = jwt.decode(accessToken) as JwtPayload;
    const refreshDecoded = jwt.decode(refreshToken) as JwtPayload;

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date((accessDecoded.exp ?? 0) * 1000),
      refreshTokenExpiresAt: new Date((refreshDecoded.exp ?? 0) * 1000),
    };
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.accessSecret, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret, { algorithms: ['HS256'] }) as JwtPayload;
    } catch {
      return null;
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

export const createTokenService = (): TokenService => new JwtTokenService();
