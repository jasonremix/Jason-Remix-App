import type { ApiErrorCode, ApiErrorPayload } from '@/types/api';

/**
 * Ein Fehler, der bereits eine für Mitglieder geeignete Formulierung trägt. Rohe Netzwerk-
 * und Parse-Fehler werden hierin verpackt, damit weder Stacktrace noch Statuscode je auf
 * einem Screen landet.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, string>;
  /** True, wenn ein erneuter Versuch derselben Aktion plausibel gelingen könnte. */
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

/** Texte für Mitglieder. Bewusst untechnisch — keine Codes, keine Statusnummern. */
const MESSAGES: Record<ApiErrorCode, string> = {
  BAD_REQUEST: 'Bitte prüfe deine Eingaben und versuche es erneut.',
  UNAUTHORIZED: 'Bitte melde dich erneut an.',
  FORBIDDEN: 'Auf diesen Bereich hast du keinen Zugriff.',
  NOT_FOUND: 'Das ist nicht mehr verfügbar.',
  CONFLICT: 'Das hat nicht geklappt — etwas hat sich zwischenzeitlich geändert.',
  INSUFFICIENT_CREDITS: 'Dafür reicht dein Guthaben nicht aus.',
  MISSION_ON_COOLDOWN: 'Diese Mission ist noch nicht wieder verfügbar. Schau bald wieder vorbei.',
  MISSION_ALREADY_COMPLETED: 'Diese Mission hast du bereits erledigt.',
  GIVEAWAY_CLOSED: 'Dieses Gewinnspiel ist beendet.',
  GIVEAWAY_ENTRY_LIMIT: 'Du hast alle deine Lose für dieses Gewinnspiel eingesetzt.',
  REWARD_UNAVAILABLE: 'Diese Prämie ist derzeit nicht verfügbar.',
  RATE_LIMITED: 'Zu viele Versuche. Bitte warte einen Moment.',
  SPOTIFY_NOT_CONFIGURED: 'Spotify ist noch nicht verfügbar.',
  SPOTIFY_AUTH_FAILED: 'Spotify konnte nicht verbunden werden.',
  TOKEN_EXPIRED: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  ACCOUNT_BANNED: 'Dieses Konto wurde gesperrt.',
  SERVER_ERROR: 'Da ist etwas schiefgelaufen.',
  OFFLINE: 'Du bist offline. Einige Funktionen sind gerade nicht verfügbar.',
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
    return new AppError('OFFLINE', 'Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.');
  }
  return new AppError('SERVER_ERROR', MESSAGES.SERVER_ERROR);
}

/** Codes whose server message is member-facing copy, not an internal detail. */
const PASS_THROUGH_CODES = new Set<ApiErrorCode>(['BAD_REQUEST', 'CONFLICT']);

export function fromApiPayload(payload: unknown, status: number): AppError {
  const code = readCode(payload, status);
  const serverMessage = readMessage(payload);
  // Validation and conflict copy from the server is written for members and is far more
  // useful than a generic line — "that address is already taken" beats "something
  // changed". Everything else falls back to our own wording so internal detail never
  // leaks into the UI.
  const message =
    PASS_THROUGH_CODES.has(code) && serverMessage ? serverMessage : messageForCode(code);
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
