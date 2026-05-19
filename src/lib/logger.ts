/**
 * Minimal structured logger for v3.
 *
 * Replaces ad-hoc `console.log` / `console.error` calls with a single
 * entry point that:
 *   - Emits one JSON object per line, easy to grep / pipe to a collector
 *   - Redacts known-sensitive fields (`apiKey`, `phone`, `email`, `token`)
 *   - Defaults level to `info`; level can be raised in CI/prod via LOG_LEVEL
 *
 * Intentionally tiny — adopting pino/winston is fine later if needs grow.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED_KEYS = new Set([
  "apikey",
  "api_key",
  "token",
  "password",
  "secret",
  "imessagephone",
  "phone",
  "email",
  "emailaddress",
]);

function envLevel(): Level {
  const raw = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (raw === "debug" || raw === "warn" || raw === "error") return raw;
  return "info";
}

function redact(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);

  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) {
      result[k] = typeof v === "string" && v.length > 0 ? "[REDACTED]" : v;
    } else {
      result[k] = redact(v);
    }
  }
  return result;
}

function emit(level: Level, scope: string, message: string, data?: unknown) {
  if (LEVEL_RANK[level] < LEVEL_RANK[envLevel()]) return;
  const record = {
    ts: new Date().toISOString(),
    level,
    scope,
    msg: message,
    ...(data ? { data: redact(data) } : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function logger(scope: string) {
  return {
    debug: (message: string, data?: unknown) => emit("debug", scope, message, data),
    info: (message: string, data?: unknown) => emit("info", scope, message, data),
    warn: (message: string, data?: unknown) => emit("warn", scope, message, data),
    error: (message: string, data?: unknown) => emit("error", scope, message, data),
  };
}
