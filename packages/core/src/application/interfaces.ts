import type { PaginationParams, PaginatedResponse } from '../shared/pagination';

export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Output>;
}

export interface Query<Input, Output> {
  execute(input: Input): Promise<Output>;
}

export interface PaginatedQuery<Input, Output> {
  execute(input: Input & PaginationParams): Promise<PaginatedResponse<Output>>;
}

export interface Command<Input, Output> {
  execute(input: Input): Promise<Output>;
}
