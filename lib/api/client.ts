import { ApiError, ApiErrorCodes } from "./errors";

const TOKEN_KEYS = ["admin_token", "auth_token"] as const;
const USER_INFO_KEYS = ["user_info", "admin_user", "employee_user"] as const;

let onAuthExpired: (() => void) | null = null;

export function setOnAuthExpired(handler: (() => void) | null) {
  onAuthExpired = handler;
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function getToken(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) {
      return value;
    }
  }

  return null;
}

export function clearAuthStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }

  for (const key of TOKEN_KEYS) {
    localStorage.removeItem(key);
  }

  for (const key of USER_INFO_KEYS) {
    localStorage.removeItem(key);
  }
}

interface RequestOpts {
  signal?: AbortSignal;
  headers?: HeadersInit;
}

function makeHeaders(body: unknown, opts: RequestOpts) {
  const headers = new Headers(opts.headers);
  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (body !== undefined && !isFormData(body)) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

function makeBody(body: unknown) {
  if (body === undefined) {
    return undefined;
  }

  if (isFormData(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function isAbortError(error: unknown) {
  return (
    (typeof DOMException !== "undefined" && error instanceof DOMException) ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function mapStatusToCode(status: number): string {
  if (status === 400) {
    return ApiErrorCodes.VALIDATION_ERROR;
  }
  if (status === 403) {
    return ApiErrorCodes.FORBIDDEN;
  }
  if (status === 404) {
    return ApiErrorCodes.NOT_FOUND;
  }
  if (status === 409) {
    return ApiErrorCodes.CONFLICT;
  }
  if (status === 429) {
    return ApiErrorCodes.RATE_LIMITED;
  }
  if (status >= 500) {
    return ApiErrorCodes.SERVER_ERROR;
  }
  return ApiErrorCodes.UNKNOWN;
}

function handleAuthExpired(): never {
  clearAuthStorage();
  onAuthExpired?.();
  throw new ApiError(
    ApiErrorCodes.AUTH_EXPIRED,
    "Phiên đăng nhập đã hết hạn",
    401,
  );
}

async function parseJsonOrText(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFromParsedBody(response: Response, parsed: unknown) {
  if (parsed && typeof parsed === "object") {
    const body = parsed as {
      code?: string;
      error?: string;
      message?: string;
      details?: unknown;
    };
    return new ApiError(
      body.code ?? mapStatusToCode(response.status),
      body.error ?? body.message ?? `Lỗi ${response.status}`,
      response.status,
      body.details,
    );
  }

  return new ApiError(
    mapStatusToCode(response.status),
    typeof parsed === "string" ? parsed : `Lỗi ${response.status}`,
    response.status,
  );
}

async function request<T>(
  method: string,
  path: string,
  body: unknown | undefined,
  opts: RequestOpts = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: makeHeaders(body, opts),
      body: makeBody(body),
      signal: opts.signal,
      credentials: "include",
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(ApiErrorCodes.NETWORK_ERROR, "Lỗi kết nối mạng");
  }

  if (response.status === 401) {
    handleAuthExpired();
  }

  const parsed = await parseJsonOrText(response);

  if (!response.ok) {
    throw errorFromParsedBody(response, parsed);
  }

  return parsed as T;
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replaceAll('"', ""));
  }

  const plainMatch = value.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ? decodeURIComponent(plainMatch[1]) : null;
}

async function requestBlob(
  path: string,
  body: unknown | undefined,
  opts: RequestOpts = {},
  method = "POST",
): Promise<{ blob: Blob; filename: string | null; contentType: string | null }> {
  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers: makeHeaders(body, opts),
      body: makeBody(body),
      signal: opts.signal,
      credentials: "include",
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError(ApiErrorCodes.NETWORK_ERROR, "Lỗi kết nối mạng");
  }

  if (response.status === 401) {
    handleAuthExpired();
  }

  if (!response.ok) {
    const parsed = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    throw errorFromParsedBody(response, parsed);
  }

  return {
    blob: await response.blob(),
    filename: filenameFromContentDisposition(
      response.headers.get("content-disposition"),
    ),
    contentType: response.headers.get("content-type"),
  };
}

export const apiClient = {
  get: <T = unknown>(path: string, opts?: RequestOpts) =>
    request<T>("GET", path, undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("POST", path, body, opts),
  put: <T = unknown>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("PUT", path, body, opts),
  patch: <T = unknown>(path: string, body?: unknown, opts?: RequestOpts) =>
    request<T>("PATCH", path, body, opts),
  delete: <T = unknown>(path: string, opts?: RequestOpts) =>
    request<T>("DELETE", path, undefined, opts),
  blob: (path: string, body?: unknown, opts?: RequestOpts) =>
    requestBlob(path, body, opts, body !== undefined ? "POST" : "GET"),
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
