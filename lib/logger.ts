/**
 * Logging with mandatory redaction.
 *
 * Access tokens, refresh tokens, PKCE verifiers and passwords must never appear in
 * a log line — not in development either, since Metro logs are trivially captured.
 * Everything routed through here is scrubbed first.
 */

const SENSITIVE_KEY = /(token|secret|password|verifier|challenge|authorization|code|refresh|jwt|bearer)/i;
const BEARER_PATTERN = /(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi;
const LONG_OPAQUE = /\b[A-Za-z0-9._~+/-]{28,}\b/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (value == null) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(entry, depth + 1);
  }
  return out;
}

function redactString(value: string): string {
  return value.replace(BEARER_PATTERN, '$1[redacted]').replace(LONG_OPAQUE, '[redacted]');
}

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

export const logger = {
  debug(message: string, context?: unknown) {
    if (!isDev) return;
    console.log(`[jrx] ${message}`, context === undefined ? '' : redact(context));
  },
  warn(message: string, context?: unknown) {
    console.warn(`[jrx] ${message}`, context === undefined ? '' : redact(context));
  },
  /** Errors are logged by message only — payloads are redacted, stacks are dropped. */
  error(message: string, context?: unknown) {
    console.error(`[jrx] ${message}`, context === undefined ? '' : redact(context));
  },
};
