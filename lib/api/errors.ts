export class ApiError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public status?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export const ApiErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN: "UNKNOWN",
} as const;
