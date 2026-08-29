import type { Pool, PoolClient } from 'pg';
import type { QueryResultRow } from 'pg';
import type { User } from '../domain/user';
import type { Customer } from '../domain/customer';
import type { Barber } from '../domain/barber';
import type { Service } from '../domain/service';
import type { Appointment } from '../domain/appointment';
import type { Transaction } from '../domain/transaction';
import type { RefreshTokenData } from '../shared/auth';
import type { PaginationParams, PaginatedResponse } from '../shared/pagination';

/**
 * SQL execution seam between the application and PostgreSQL.
 *
 * Lives in the persistence layer: it expresses how data is read/written but
 * contains no implementation. The infrastructure layer provides the concrete
 * pg-backed implementation.
 */
export interface SqlExecutor {
  query<T extends QueryResultRow>(sql: string, params: unknown[]): Promise<T[]>;
  queryOne<T extends QueryResultRow>(sql: string, params: unknown[]): Promise<T | null>;
  execute(sql: string, params: unknown[]): Promise<{ rowCount: number }>;
  transaction<T>(fn: (executor: SqlExecutor) => Promise<T>): Promise<T>;
  getExecutor(): Pool | PoolClient;
}

export interface UnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

/**
 * Repository contracts.
 *
 * These interfaces express only the operations needed by the application use
 * cases. No SQL is implemented here.
 */

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<User>>;
  create(user: User): Promise<User>;
}

export interface CustomerRepository {
  create(customer: Customer): Promise<Customer>;
  update(customer: Customer): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Customer>>;
}

export interface BarberRepository {
  create(barber: Barber): Promise<Barber>;
  update(barber: Barber): Promise<Barber>;
  findById(id: string): Promise<Barber | null>;
  findByUserId(userId: string): Promise<Barber | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Barber>>;
}

export interface ServiceRepository {
  create(service: Service): Promise<Service>;
  update(service: Service): Promise<Service>;
  findById(id: string): Promise<Service | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Service>>;
}

export interface AppointmentRepository {
  create(appointment: Appointment): Promise<Appointment>;
  update(appointment: Appointment): Promise<Appointment>;
  findById(id: string): Promise<Appointment | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>>;
}

export interface TransactionRepository {
  create(transaction: Transaction): Promise<Transaction>;
  update(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Transaction>>;
}

export interface RefreshTokenRepository {
  create(token: RefreshTokenData): Promise<RefreshTokenData>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenData | null>;
  findById(id: string): Promise<RefreshTokenData | null>;
  revoke(id: string, revokedAt: Date): Promise<void>;
  revokeAllForUser(userId: string, revokedAt: Date): Promise<void>;
  markAsReplaced(oldTokenId: string, newTokenId: string, revokedAt: Date): Promise<void>;
  deleteExpired(): Promise<number>;
}

export type { RefreshTokenData };
