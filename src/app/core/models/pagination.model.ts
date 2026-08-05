export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly totalItems: number;
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}
