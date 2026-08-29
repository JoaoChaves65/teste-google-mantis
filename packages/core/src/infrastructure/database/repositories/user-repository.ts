import type { User, UserRole, UserStatus } from '../../../domain/user';
import type { UserRepository } from '../../../persistence/interfaces';
import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { BasePgRepository } from './base';

export class PgUserRepository extends BasePgRepository<User> implements UserRepository {
  constructor(executor: SqlExecutor) {
    super(executor, 'users');
  }

  protected mapRow(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      name: row.name as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.executor.queryOne('SELECT * FROM users WHERE email ILIKE $1', [
      email.trim(),
    ]);
    return row ? this.mapRow(row) : null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<User>> {
    return super.findAll(params);
  }

  async create(user: User): Promise<User> {
    await this.executor.execute(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        user.id,
        user.name,
        user.email,
        user.passwordHash,
        user.role,
        user.status,
        user.createdAt,
        user.updatedAt,
      ]
    );
    return user;
  }
}
