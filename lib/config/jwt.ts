let _cached: string | null = null;

export function getJwtSecret(): string {
  if (_cached) return _cached;
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("FATAL: JWT_SECRET environment variable is not set");
  }
  _cached = secret;
  return secret;
}
