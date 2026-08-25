import * as Crypto from 'expo-crypto';

import { config } from '@/constants/config';
import type { ApiErrorPayload, AuthTokens } from '@/types/api';

import { AppError, fromApiPayload, toAppError } from './errors';
import { logger } from './logger';
import { SecureKeys, secureStorage } from './secureStorage';

/**
 * Thin HTTP client for the Jason Remix API.
 *
 * Responsibilities kept here rather than in screens: bearer injection, single-flight
 * refresh on 401, request timeouts, idempotency keys for anything that moves credits,
 * and turning every failure into an `AppError` with member-safe wording.
 */

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: Method;
  body?: unknown;
  /** Skips bearer injection and refresh — used by the auth endpoints themselves. */
  anonymous?: boolean;
  /**
   * Guards against a retried or replayed request being applied twice. Required by the
   * server for every credit-moving endpoint.
   */
  idempotencyKey?: string;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
};

let onSessionExpired: (() => void) | null = null;

/** Registered by the auth store so a dead refresh token drops the member to sign-in. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function createIdempotencyKey(): string {
  return Crypto.randomUUID();
}

function requireBaseUrl(): string {
  if (!config.apiBaseUrl) {
    // Reaching here means a real network call was attempted while in demo mode.
    throw new AppError('SERVER_ERROR', 'Something went wrong.');
  }
  return config.apiBaseUrl.replace(/\/+$/, '');
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = requireBaseUrl();
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token refresh — single-flight so a burst of 401s triggers exactly one refresh.
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await secureStorage.get(SecureKeys.refreshToken);
    if (!refreshToken) return null;

    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;

      const payload = (await parseBody(response)) as AuthTokens | null;
      if (!payload?.accessToken || !payload?.refreshToken) return null;

      await persistTokens(payload);
      return payload.accessToken;
    } catch {
      logger.warn('token refresh failed');
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function persistTokens(tokens: AuthTokens): Promise<void> {
  const expiresAt = Date.now() + tokens.expiresIn * 1000;
  await Promise.all([
    secureStorage.set(SecureKeys.accessToken, tokens.accessToken),
    secureStorage.set(SecureKeys.refreshToken, tokens.refreshToken),
    secureStorage.set(SecureKeys.accessTokenExpiry, String(expiresAt)),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    secureStorage.remove(SecureKeys.accessToken),
    secureStorage.remove(SecureKeys.refreshToken),
    secureStorage.remove(SecureKeys.accessTokenExpiry),
  ]);
}

/** Refreshes proactively when the access token is inside its last 60 seconds. */
async function currentAccessToken(): Promise<string | null> {
  const [token, expiryRaw] = await Promise.all([
    secureStorage.get(SecureKeys.accessToken),
    secureStorage.get(SecureKeys.accessTokenExpiry),
  ]);
  if (!token) return null;

  const expiry = expiryRaw ? Number(expiryRaw) : 0;
  if (expiry && Date.now() > expiry - 60_000) {
    return (await refreshAccessToken()) ?? token;
  }
  return token;
}

// ---------------------------------------------------------------------------

async function execute<T>(path: string, options: RequestOptions, isRetry: boolean): Promise<T> {
  const method = options.method ?? 'GET';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller);

  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'x-client-platform': 'expo',
      'x-client-version': config.appVersion,
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.idempotencyKey) headers['idempotency-key'] = options.idempotencyKey;

    if (!options.anonymous) {
      const token = await currentAccessToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    if (response.status === 401 && !options.anonymous && !isRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) return execute<T>(path, options, true);
      await clearTokens();
      onSessionExpired?.();
      throw new AppError('TOKEN_EXPIRED', 'Your session expired. Please sign in again.', {
        status: 401,
      });
    }

    const payload = await parseBody(response);

    if (!response.ok) {
      logger.debug(`api ${method} ${path} -> ${response.status}`, payload as ApiErrorPayload);
      throw fromApiPayload(payload, response.status);
    }

    return payload as T;
  } catch (error) {
    throw toAppError(error);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export const apiClient = {
  request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return execute<T>(path, options, false);
  },
  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return execute<T>(path, { ...options, method: 'GET' }, false);
  },
  post<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return execute<T>(path, { ...options, method: 'POST', body }, false);
  },
  patch<T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) {
    return execute<T>(path, { ...options, method: 'PATCH', body }, false);
  },
  delete<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return execute<T>(path, { ...options, method: 'DELETE' }, false);
  },
};
