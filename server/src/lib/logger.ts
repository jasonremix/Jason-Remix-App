/**
 * Logging with redaction.
 *
 * Tokens, password material and authorization headers must never reach a log line —
 * not in development either. Everything routed through here is scrubbed first.
 */

const SENSITIVE_KEY = /(token|secret|password|verifier|authorization|code|refresh|hash|cipher)/i;
const LONG_OPAQUE = /\b[A-Za-z0-9._~+/-]{28,}\b/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value == null) return value;
  if (typeof value === 'string') return value.replace(LONG_OPAQUE, '[redacted]');
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(entry, depth + 1);
  }
  return out;
}

const silent = process.env.NODE_ENV === 'test';

export const logger = {
  info(message: string, context?: unknown) {
    if (silent) return;
    console.log(`[api] ${message}`, context === undefined ? '' : redact(context));
  },
  warn(message: string, context?: unknown) {
    if (silent) return;
    console.warn(`[api] ${message}`, context === undefined ? '' : redact(context));
  },
  error(message: string, context?: unknown) {
    if (silent) return;
    console.error(`[api] ${message}`, context === undefined ? '' : redact(context));
  },
};
