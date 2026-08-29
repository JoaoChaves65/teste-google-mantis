import { InvalidCredentialsError } from '../../domain/errors';
import { UserStatus } from '../../domain/user';
import { sha256 } from '../../shared/auth';
import type { User } from '../../domain/user';
import type { UserRepository } from '../../persistence/interfaces';
import type { RefreshTokenRepository } from '../../persistence/interfaces';
import type { PasswordHasher } from '../../shared/password-hasher';
import type { TokenService } from '../../shared/token-service';
import type { TokenPair, RefreshTokenData } from '../../shared/auth';
import type { Command } from '../interfaces';
import { randomUUID } from 'node:crypto';

export interface LoginCommandInput {
  email: string;
  password: string;
}

export interface LoginCommandOutput {
  user: User;
  tokens: TokenPair;
}

export class LoginCommand implements Command<LoginCommandInput, LoginCommandOutput> {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService
  ) {}

  async execute(input: LoginCommandInput): Promise<LoginCommandOutput> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new InvalidCredentialsError();
    }

    const isValid = await this.passwordHasher.verify(user.passwordHash, input.password);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    const tokens = this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token hash in database
    const refreshTokenHash = sha256(tokens.refreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const refreshTokenData: RefreshTokenData = {
      id: randomUUID(),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
      revokedAt: null,
      replacedByTokenId: null,
      createdAt: now,
    };

    await this.refreshTokens.create(refreshTokenData);

    return { user, tokens };
  }
}
