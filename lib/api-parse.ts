export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function unwrapPayload(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;
  if ("data" in record && record.data !== undefined) return record.data;
  if ("result" in record && record.result !== undefined) return record.result;
  return value;
}

export function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function errorMessageFromBody(body: unknown, fallback: string) {
  const record = asRecord(body);
  if (!record) return fallback;
  const message = record.message ?? record.error ?? record.reason;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === "string").join(" ") || fallback;
  }
  return pickString(record.reason) ?? fallback;
}
