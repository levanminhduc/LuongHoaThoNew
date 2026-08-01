import { encryptJson, decryptJson } from "@/lib/utils/client-crypto";
import { isJwtExpired } from "@/lib/auth/jwt-expiry";

const TOKEN_KEY = "admin_token";
const USER_KEY = "user_info";
const LEGACY_TOKEN_FALLBACK_KEYS = ["auth_token"] as const;
const ENCRYPTED_PREFIX = "enc.v1.";
const KEY_MATERIAL = "hoatho-admin-session-v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

async function encryptValue(value: unknown): Promise<string> {
  return `${ENCRYPTED_PREFIX}${await encryptJson(KEY_MATERIAL, value)}`;
}

async function decryptValue<T>(stored: string): Promise<T> {
  return decryptJson<T>(KEY_MATERIAL, stored.slice(ENCRYPTED_PREFIX.length));
}

async function migrateLegacyValue(key: string, value: unknown): Promise<void> {
  try {
    localStorage.setItem(key, await encryptValue(value));
  } catch {
    return;
  }
}

const PURGEABLE_CACHE_PREFIXES = ["dashboard_cache_", "department_cache_"];

async function toStoredValue(
  value: unknown,
  plaintextFallback: string,
): Promise<string> {
  try {
    return await encryptValue(value);
  } catch {
    return plaintextFallback;
  }
}

function purgeAppCaches(): void {
  for (const key of Object.keys(localStorage)) {
    if (PURGEABLE_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
}

function setItemWithPurgeRetry(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    purgeAppCaches();
    localStorage.setItem(key, value);
  }
}

export async function saveSession(token: string, user: unknown): Promise<void> {
  if (!isBrowser()) return;
  setItemWithPurgeRetry(TOKEN_KEY, await toStoredValue(token, token));
  setItemWithPurgeRetry(
    USER_KEY,
    await toStoredValue(user, JSON.stringify(user)),
  );
}

export async function getSessionToken(): Promise<string | null> {
  if (!isBrowser()) return null;

  const token = await readStoredToken();
  if (!token) return null;

  if (isJwtExpired(token)) {
    clearSession();
    return null;
  }

  return token;
}

async function readStoredToken(): Promise<string | null> {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    if (stored.startsWith(ENCRYPTED_PREFIX)) {
      try {
        return await decryptValue<string>(stored);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
    }
    void migrateLegacyValue(TOKEN_KEY, stored);
    return stored;
  }

  for (const key of LEGACY_TOKEN_FALLBACK_KEYS) {
    const legacy = localStorage.getItem(key);
    if (legacy) return legacy;
  }

  return null;
}

export async function getSessionUser<T>(): Promise<T | null> {
  if (!isBrowser()) return null;

  const stored = localStorage.getItem(USER_KEY);
  if (!stored) return null;

  if (stored.startsWith(ENCRYPTED_PREFIX)) {
    try {
      return await decryptValue<T>(stored);
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  try {
    const user = JSON.parse(stored) as T;
    void migrateLegacyValue(USER_KEY, user);
    return user;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export async function getSession<T>(): Promise<{
  token: string;
  user: T | null;
} | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return { token, user: await getSessionUser<T>() };
}

export function hasStoredSession(): boolean {
  return isBrowser() && !!localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  for (const key of LEGACY_TOKEN_FALLBACK_KEYS) {
    localStorage.removeItem(key);
  }
}
