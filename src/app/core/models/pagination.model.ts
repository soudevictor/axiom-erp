export interface PaginationMeta {
  readonly totalItems: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly totalItems: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly meta?: PaginationMeta;
  readonly summary?: Record<string, number>;
}
