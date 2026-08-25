import type { ApiErrorCode, ApiErrorPayload } from '@/types/api';

/**
 * A failure that already carries member-safe wording. Raw network/parse errors are
 * wrapped into this so no stack trace or status code ever reaches a screen.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;
  /** True when retrying the same action could plausibly succeed. */
  readonly retryable: boolean;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { status?: number; details?: Record<string, string>; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? 0;
    this.details = options.details;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
  }
}

const RETRYABLE_CODES = new Set<ApiErrorCode>(['OFFLINE', 'SERVER_ERROR', 'RATE_LIMITED']);

/** Copy shown to members. Deliberately non-technical — no codes, no status numbers. */
const MESSAGES: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Please check the details you entered and try again.',
  UNAUTHORIZED: 'Please sign in again to continue.',
  FORBIDDEN: 'You do not have access to this area.',
  NOT_FOUND: 'This is no longer available.',
  CONFLICT: 'That did not work — something has already changed.',
  INSUFFICIENT_CREDITS: 'You do not have enough credits for this.',
  MISSION_ON_COOLDOWN: 'This mission is not ready yet. Come back soon.',
  MISSION_ALREADY_COMPLETED: 'You have already completed this mission.',
  GIVEAWAY_CLOSED: 'This giveaway is closed.',
  GIVEAWAY_ENTRY_LIMIT: 'You have used all your entries for this giveaway.',
  REWARD_UNAVAILABLE: 'This reward is currently unavailable.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment.',
  SPOTIFY_NOT_CONFIGURED: 'Spotify is not available yet.',
  SPOTIFY_AUTH_FAILED: 'Spotify could not be connected.',
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  ACCOUNT_BANNED: 'This account has been suspended.',
  SERVER_ERROR: 'Something went wrong.',
  OFFLINE: 'You are offline. Some features are currently unavailable.',
};

export function messageForCode(code: ApiErrorCode): string {
  return MESSAGES[code] ?? MESSAGES.SERVER_ERROR;
}

/** Normalises anything thrown anywhere in the app into an `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof TypeError || (error instanceof Error && /network|fetch/i.test(error.message))) {
    return new AppError('OFFLINE', MESSAGES.OFFLINE);
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new AppError('OFFLINE', 'The request took too long. Please try again.');
  }
  return new AppError('SERVER_ERROR', MESSAGES.SERVER_ERROR);
}

export function fromApiPayload(payload: unknown, status: number): AppError {
  const code = readCode(payload, status);
  const serverMessage = readMessage(payload);
  // Validation copy from the server is safe to surface; everything else falls back
  // to our own wording so internal detail never leaks into the UI.
  const message = code === 'BAD_REQUEST' && serverMessage ? serverMessage : messageForCode(code);
  return new AppError(code, message, { status, details: readDetails(payload) });
}

function readCode(payload: unknown, status: number): ApiErrorCode {
  const candidate = (payload as ApiErrorPayload | undefined)?.error?.code;
  if (typeof candidate === 'string' && candidate in MESSAGES) return candidate as ApiErrorCode;
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 400 && status < 500) return 'BAD_REQUEST';
  return 'SERVER_ERROR';
}

function readMessage(payload: unknown): string | undefined {
  const message = (payload as ApiErrorPayload | undefined)?.error?.message;
  return typeof message === 'string' && message.length > 0 ? message : undefined;
}

function readDetails(payload: unknown): Record<string, string> | undefined {
  const details = (payload as ApiErrorPayload | undefined)?.error?.details;
  return details && typeof details === 'object' ? details : undefined;
}
