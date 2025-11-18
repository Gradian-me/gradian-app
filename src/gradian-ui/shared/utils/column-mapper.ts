export type DotPath = string;

export interface ColumnMapConfig {
  item?: {
    id?: DotPath;
    label?: DotPath; // will map into item.title if title is missing
    title?: DotPath; // explicit title mapping
    name?: DotPath; // explicit name mapping
    subtitle?: DotPath;
    icon?: DotPath;
    color?: DotPath;
    avatar?: DotPath;
    status?: DotPath;
    rating?: DotPath;
    code?: DotPath;
  };
  request?: {
    page?: string;
    limit?: string;
    search?: string;
    includeIds?: string;
    excludeIds?: string;
  };
  response?: {
    data?: DotPath; // location of items array within payload
    meta?: {
      page?: DotPath;
      limit?: DotPath;
      totalItems?: DotPath;
      hasMore?: DotPath;
      next?: DotPath;
      previous?: DotPath;
    };
  };
}

const isObject = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const getByPath = (obj: any, path?: string): any => {
  if (!obj || !path) return undefined;
  const parts = path.split('.').filter(Boolean);
  let current: any = obj;
  for (const part of parts) {
    if (!isObject(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string, any>)?.[part];
    if (current === undefined || current === null) break;
  }
  return current;
};

export const setIfMissing = (target: Record<string, any>, key: string, value: any) => {
  if (value === undefined || value === null) return;
  if (target[key] === undefined) {
    target[key] = value;
  }
};

export const applyItemFieldMapping = (item: any, config?: ColumnMapConfig['item']): any => {
  if (!config) return item;
  const mapped: any = { ...item };
  const id = getByPath(item, config.id);
  setIfMissing(mapped, 'id', id !== undefined ? String(id) : id);

  const title = getByPath(item, config.title);
  const label = getByPath(item, config.label);
  const name = getByPath(item, config.name);
  // Prefer explicit title, then label, then name
  setIfMissing(mapped, 'title', title ?? label ?? name);
  setIfMissing(mapped, 'name', name ?? label ?? title);

  setIfMissing(mapped, 'subtitle', getByPath(item, config.subtitle));
  setIfMissing(mapped, 'icon', getByPath(item, config.icon));
  setIfMissing(mapped, 'color', getByPath(item, config.color));
  setIfMissing(mapped, 'avatar', getByPath(item, config.avatar));
  setIfMissing(mapped, 'status', getByPath(item, config.status));
  setIfMissing(mapped, 'rating', getByPath(item, config.rating));
  setIfMissing(mapped, 'code', getByPath(item, config.code));
  return mapped;
};

export const extractItemsFromPayload = (payload: any, config?: ColumnMapConfig): any[] => {
  if (Array.isArray(payload)) {
    return config?.item ? payload.map((it) => applyItemFieldMapping(it, config.item)) : payload;
  }
  const dataPath = config?.response?.data;
  const raw = dataPath ? getByPath(payload, dataPath) : payload?.data;
  const arr = Array.isArray(raw) ? raw : [];
  if (!config?.item) return arr;
  return arr.map((it) => applyItemFieldMapping(it, config.item));
};

export interface MappedMeta {
  page?: number;
  limit?: number;
  totalItems?: number;
  hasMore?: boolean;
  next?: string | number | null;
  previous?: string | number | null;
}

export const extractMetaFromPayload = (payload: any, config?: ColumnMapConfig, defaults?: Partial<MappedMeta>): MappedMeta => {
  const metaMap = config?.response?.meta;
  const baseMeta: any = {};
  const read = (key: keyof NonNullable<typeof metaMap>) => getByPath(payload, metaMap?.[key]);
  const coerceNum = (v: any): number | undefined => (v === undefined || v === null || v === '' ? undefined : Number(v));
  const coerceBool = (v: any): boolean | undefined => (typeof v === 'boolean' ? v : v === undefined ? undefined : Boolean(v));

  baseMeta.page = coerceNum(read('page'));
  baseMeta.limit = coerceNum(read('limit'));
  baseMeta.totalItems = coerceNum(read('totalItems'));
  baseMeta.hasMore = coerceBool(read('hasMore'));
  baseMeta.next = read('next') ?? null;
  baseMeta.previous = read('previous') ?? null;

  // Fall back to common top-level meta shape if mapping doesn't provide values
  const fallbackMeta = isObject(payload?.meta) ? payload.meta : undefined;
  baseMeta.page ??= coerceNum(fallbackMeta?.page);
  baseMeta.limit ??= coerceNum(fallbackMeta?.limit);
  baseMeta.totalItems ??= coerceNum(fallbackMeta?.totalItems);
  baseMeta.hasMore ??= typeof fallbackMeta?.hasMore === 'boolean' ? fallbackMeta.hasMore : undefined;

  return {
    page: baseMeta.page ?? defaults?.page,
    limit: baseMeta.limit ?? defaults?.limit,
    totalItems: baseMeta.totalItems ?? defaults?.totalItems,
    hasMore: baseMeta.hasMore ?? defaults?.hasMore,
    next: baseMeta.next ?? (defaults?.next ?? null),
    previous: baseMeta.previous ?? (defaults?.previous ?? null),
  };
};

export const mapRequestParams = (params: Record<string, string>, config?: ColumnMapConfig): URLSearchParams => {
  const searchParams = new URLSearchParams();
  if (!config?.request) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length > 0) {
        searchParams.set(k, String(v));
      }
    });
    return searchParams;
  }
  const { request } = config;
  const mapKey = (key: string) => {
    switch (key) {
      case 'page':
        return request.page || 'page';
      case 'limit':
        return request.limit || 'limit';
      case 'search':
        return request.search || 'search';
      case 'includeIds':
        return request.includeIds || 'includeIds';
      case 'excludeIds':
        return request.excludeIds || 'excludeIds';
      default:
        return key;
    }
  };
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length > 0) {
      searchParams.set(mapKey(k), String(v));
    }
  });
  return searchParams;
};


