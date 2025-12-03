export interface PaginationParamsInput {
  page?: number | string | null;
  limit?: number | string | null;
  search?: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 200;

export const parsePaginationParams = (
  input?: PaginationParamsInput,
  options?: { defaultLimit?: number; maxLimit?: number }
): PaginationParams => {
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = options?.maxLimit ?? MAX_LIMIT;

  const parsedPage = Number(input?.page ?? DEFAULT_PAGE);
  const parsedLimit = Number(input?.limit ?? defaultLimit);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : DEFAULT_PAGE;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? clamp(Math.floor(parsedLimit), 1, maxLimit) : defaultLimit;

  const search = input?.search?.toString().trim();

  return {
    page,
    limit,
    ...(search ? { search } : {}),
  };
};

export const paginateArray = <T>(items: T[], page: number, limit: number): T[] => {
  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
};

export const buildPaginationMeta = (totalItems: number, page: number, limit: number): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const safePage = clamp(page, 1, totalPages);
  const hasMore = safePage < totalPages;

  return {
    page: safePage,
    limit,
    totalItems,
    totalPages,
    hasMore,
  };
};


