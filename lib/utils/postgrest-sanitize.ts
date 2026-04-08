export function sanitizePostgrestValue(input: string): string {
  return input.replace(/[^a-zA-Z0-9\s\u00C0-\u024F\u1E00-\u1EFF-]/g, "").trim();
}
