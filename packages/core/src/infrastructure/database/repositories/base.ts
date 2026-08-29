import type { SqlExecutor } from '../../../persistence/interfaces';
import type { PaginationParams, PaginatedResponse } from '../../../shared/pagination';
import { createPaginationMeta, validatePagination } from '../../../shared/pagination';

export abstract class BasePgRepository<T> {
  protected constructor(
    protected readonly executor: SqlExecutor,
    protected readonly tableName: string,
    protected readonly idColumn = 'id'
  ) {}

  protected abstract mapRow(row: Record<string, unknown>): T;

  async findById(id: string): Promise<T | null> {
    const row = await this.executor.queryOne(
      `SELECT * FROM ${this.tableName} WHERE ${this.idColumn} = $1`,
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<T>> {
    const { page, limit } = validatePagination(params);
    const offset = (page - 1) * limit;

    const [dataRows, countRow] = await Promise.all([
      this.executor.query(
        `SELECT * FROM ${this.tableName} ORDER BY created_at ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      this.executor.queryOne(`SELECT COUNT(*)::int as total FROM ${this.tableName}`, []),
    ]);

    const data = dataRows.map(row => this.mapRow(row));
    const total = countRow?.total ?? 0;

    return {
      data,
      meta: createPaginationMeta(page, limit, total),
    };
  }
}
