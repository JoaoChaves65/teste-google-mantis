import { sha256 } from '../../shared/auth';
import {
  TokenExpiredError,
  TokenRevokedError,
  TokenInvalidError,
  EntityNotFoundError,
  AccountInactiveError,
} from '../../domain/errors';
import { UserStatus } from '../../domain/user';
import type { User } from '../../domain/user';
import type { UserRepository } from '../../persistence/interfaces';
import type { RefreshTokenRepository } from '../../persistence/interfaces';
import type { TokenService } from '../../shared/token-service';
import type { TokenPair } from '../../shared/auth';
import type { Command } from '../interfaces';
import { randomUUID } from 'node:crypto';
import type { SqlExecutor } from '../../persistence/interfaces';

export interface RefreshTokenCommandInput {
  refreshToken: string;
}

export interface RefreshTokenCommandOutput {
  user: User;
  tokens: TokenPair;
}

export class RefreshTokenCommand implements Command<
  RefreshTokenCommandInput,
  RefreshTokenCommandOutput
> {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly sqlExecutor: SqlExecutor
  ) {}

  async execute(input: RefreshTokenCommandInput): Promise<RefreshTokenCommandOutput> {
    const payload = this.tokenService.verifyRefreshToken(input.refreshToken);
    if (!payload) {
      throw new TokenInvalidError('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new TokenInvalidError('Token is not a refresh token');
    }

    const tokenHash = sha256(input.refreshToken);
    const storedToken = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!storedToken) {
      throw new TokenRevokedError('Refresh token not found or revoked');
    }

    if (storedToken.revokedAt !== null) {
      throw new TokenRevokedError('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new TokenExpiredError('Refresh token has expired');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new EntityNotFoundError('User', payload.sub);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountInactiveError();
    }

    // Generate new token pair FIRST so we have the actual refresh token
    const tokens = this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshTokenHash = sha256(tokens.refreshToken);
    const newId = randomUUID();
    const now = new Date();
    const expiresAt = tokens.refreshTokenExpiresAt;

    // Atomic transaction: create new token FIRST, then revoke old
    await this.sqlExecutor.transaction(async executor => {
      // Create new refresh token record FIRST (so FK can reference it)
      await executor.execute(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, replaced_by_token_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [newId, storedToken.userId, newRefreshTokenHash, expiresAt, null, null, now]
      );

      // Then revoke the old token, pointing to the new one
      await executor.execute(
        `UPDATE refresh_tokens SET revoked_at = $1, replaced_by_token_id = $2 WHERE id = $3`,
        [now, newId, storedToken.id]
      );
    });

    return { user, tokens };
  }
}
