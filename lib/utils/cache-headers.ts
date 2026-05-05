export const CACHE_HEADERS = {
  sensitive: { "Cache-Control": "private, no-store, max-age=0" },
  shortPrivate: { "Cache-Control": "private, max-age=60" },
  static: { "Cache-Control": "public, max-age=300" },
} as const;

export type CacheHeaderKey = keyof typeof CACHE_HEADERS;
