import { clearTokens } from '@/lib/apiClient';
import { AppError } from '@/lib/errors';
import { secureStorage } from '@/lib/secureStorage';
import type { MeResponse, SessionPayload } from '@/types/api';
import type { UserProfile } from '@/types/models';

import { getBackend } from './backend';
import type { LoginInput, RegisterInput, UpdateProfileInput } from './backend.types';

/** Account lifecycle. All validation that matters is repeated on the server. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/i;
export const MIN_PASSWORD_LENGTH = 10;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email.trim())) return 'That email address does not look right.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return 'Include at least one letter and one number.';
  }
  return null;
}

export function validateUsername(username: string): string | null {
  if (!USERNAME_PATTERN.test(username.trim())) {
    return 'Use 3–20 letters, numbers, dots or underscores.';
  }
  return null;
}

export const authService = {
  async register(input: RegisterInput): Promise<SessionPayload> {
    const emailError = validateEmail(input.email);
    if (emailError) throw new AppError('BAD_REQUEST', emailError, { details: { email: emailError } });
    const passwordError = validatePassword(input.password);
    if (passwordError) {
      throw new AppError('BAD_REQUEST', passwordError, { details: { password: passwordError } });
    }
    const usernameError = validateUsername(input.username);
    if (usernameError) {
      throw new AppError('BAD_REQUEST', usernameError, { details: { username: usernameError } });
    }
    if (!input.acceptedTerms) {
      throw new AppError('BAD_REQUEST', 'Please accept the terms to continue.');
    }

    return getBackend().register({
      ...input,
      email: input.email.trim().toLowerCase(),
      username: input.username.trim(),
    });
  },

  async login(input: LoginInput): Promise<SessionPayload> {
    const emailError = validateEmail(input.email);
    if (emailError) throw new AppError('BAD_REQUEST', emailError, { details: { email: emailError } });
    if (!input.password) {
      throw new AppError('BAD_REQUEST', 'Enter your password.', { details: { password: 'Required' } });
    }
    return getBackend().login({ ...input, email: input.email.trim().toLowerCase() });
  },

  async logout(): Promise<void> {
    try {
      await getBackend().logout();
    } finally {
      await clearTokens();
      await secureStorage.clearAll();
    }
  },

  me: (): Promise<MeResponse> => getBackend().me(),

  updateProfile: (input: UpdateProfileInput): Promise<UserProfile> =>
    getBackend().updateProfile(input),

  changePassword: (input: { currentPassword: string; newPassword: string }) => {
    const error = validatePassword(input.newPassword);
    if (error) throw new AppError('BAD_REQUEST', error, { details: { newPassword: error } });
    return getBackend().changePassword(input);
  },

  async deleteAccount(input: { password?: string }): Promise<void> {
    await getBackend().deleteAccount(input);
    await secureStorage.clearAll();
  },

  exportData: () => getBackend().exportData(),
};
