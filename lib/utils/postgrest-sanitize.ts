export function sanitizePostgrestValue(input: string): string {
  return input.replace(/[,.()"'\\]/g, "").trim();
}
