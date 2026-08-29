import type { SqlExecutor } from '../../../persistence/interfaces';
import type { RefreshTokenRepository, RefreshTokenData } from '../../../persistence/interfaces';

export class PgRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly executor: SqlExecutor) {}

  async create(token: RefreshTokenData): Promise<RefreshTokenData> {
    await this.executor.execute(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, replaced_by_token_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        token.id,
        token.userId,
        token.tokenHash,
        token.expiresAt,
        token.revokedAt,
        token.replacedByTokenId,
        token.createdAt,
      ]
    );
    return token;
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenData | null> {
    const row = await this.executor.queryOne(`SELECT * FROM refresh_tokens WHERE token_hash = $1`, [
      tokenHash,
    ]);
    return row ? this.mapRow(row) : null;
  }

  async findById(id: string): Promise<RefreshTokenData | null> {
    const row = await this.executor.queryOne(`SELECT * FROM refresh_tokens WHERE id = $1`, [id]);
    return row ? this.mapRow(row) : null;
  }

  async revoke(id: string, revokedAt: Date): Promise<void> {
    await this.executor.execute(`UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2`, [
      revokedAt,
      id,
    ]);
  }

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.executor.execute(
      `UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL`,
      [revokedAt, userId]
    );
  }

  async markAsReplaced(oldTokenId: string, newTokenId: string, revokedAt: Date): Promise<void> {
    await this.executor.execute(
      `UPDATE refresh_tokens SET revoked_at = $1, replaced_by_token_id = $2 WHERE id = $3`,
      [revokedAt, newTokenId, oldTokenId]
    );
  }

  async deleteExpired(): Promise<number> {
    const result = await this.executor.execute(`DELETE FROM refresh_tokens WHERE expires_at < $1`, [
      new Date(),
    ]);
    return result.rowCount ?? 0;
  }

  private mapRow(row: Record<string, unknown>): RefreshTokenData {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tokenHash: row.token_hash as string,
      expiresAt: row.expires_at as Date,
      revokedAt: row.revoked_at as Date | null,
      replacedByTokenId: row.replaced_by_token_id as string | null,
      createdAt: row.created_at as Date,
    };
  }
}
