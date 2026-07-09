import { encryptJson, decryptJson } from "@/lib/utils/client-crypto";

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

export async function saveSession(token: string, user: unknown): Promise<void> {
  if (!isBrowser()) return;
  localStorage.setItem(TOKEN_KEY, await encryptValue(token));
  localStorage.setItem(USER_KEY, await encryptValue(user));
}

export async function getSessionToken(): Promise<string | null> {
  if (!isBrowser()) return null;

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
}
