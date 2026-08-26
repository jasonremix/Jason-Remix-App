/**
 * API error type.
 *
 * Every failure sent to a client is one of these. The `message` is member-safe copy;
 * internal detail never leaves the process.
 */

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INSUFFICIENT_CREDITS'
  | 'MISSION_ON_COOLDOWN'
  | 'MISSION_ALREADY_COMPLETED'
  | 'GIVEAWAY_CLOSED'
  | 'GIVEAWAY_ENTRY_LIMIT'
  | 'REWARD_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'SPOTIFY_NOT_CONFIGURED'
  | 'SPOTIFY_AUTH_FAILED'
  | 'TOKEN_EXPIRED'
  | 'ACCOUNT_BANNED'
  | 'SERVER_ERROR';

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INSUFFICIENT_CREDITS: 409,
  MISSION_ON_COOLDOWN: 409,
  MISSION_ALREADY_COMPLETED: 409,
  GIVEAWAY_CLOSED: 409,
  GIVEAWAY_ENTRY_LIMIT: 409,
  REWARD_UNAVAILABLE: 409,
  RATE_LIMITED: 429,
  SPOTIFY_NOT_CONFIGURED: 503,
  SPOTIFY_AUTH_FAILED: 502,
  TOKEN_EXPIRED: 401,
  ACCOUNT_BANNED: 403,
  SERVER_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }

  toPayload() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export const badRequest = (message: string, details?: Record<string, string>) =>
  new ApiError('BAD_REQUEST', message, details);
export const unauthorized = (message = 'Please sign in again to continue.') =>
  new ApiError('UNAUTHORIZED', message);
export const forbidden = (message = 'You do not have access to this area.') =>
  new ApiError('FORBIDDEN', message);
export const notFound = (message = 'This is no longer available.') =>
  new ApiError('NOT_FOUND', message);
