import { TokenInvalidError, TokenRevokedError } from '../../domain/errors';
import { sha256 } from '../../shared/auth';
import type { RefreshTokenRepository } from '../../persistence/interfaces';
import type { TokenService } from '../../shared/token-service';
import type { Command } from '../interfaces';

export interface LogoutCommandInput {
  refreshToken: string;
}

export class LogoutCommand implements Command<LogoutCommandInput, void> {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LogoutCommandInput): Promise<void> {
    const payload = this.tokenService.verifyRefreshToken(input.refreshToken);
    if (!payload || payload.type !== 'refresh') {
      throw new TokenInvalidError('Invalid refresh token');
    }

    const tokenHash = sha256(input.refreshToken);
    const storedToken = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!storedToken) {
      return;
    }

    if (storedToken.revokedAt !== null) {
      throw new TokenRevokedError('Refresh token already revoked');
    }

    await this.refreshTokens.revoke(storedToken.id, new Date());
  }
}
