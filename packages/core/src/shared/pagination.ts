export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const createPaginationMeta = (
  page: number,
  limit: number,
  total: number
): PaginatedResponse<never>['meta'] => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const validatePagination = (params: Partial<PaginationParams>): PaginationParams => {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(params.limit ?? 20)));
  return { page, limit };
};
