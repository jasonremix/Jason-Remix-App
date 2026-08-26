import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { clearTokens, setSessionExpiredHandler } from '@/lib/apiClient';
import { toAppError } from '@/lib/errors';
import { SecureKeys, secureStorage } from '@/lib/secureStorage';
import { authService } from '@/services/auth.service';
import type { LoginInput, RegisterInput } from '@/services/backend.types';
import type { EmailVerificationStatus } from '@/types/api';
import type { User, UserProfile } from '@/types/models';

/**
 * Session state.
 *
 * Only identity lives here. Balances, missions and catalog data are server state and are
 * owned by React Query so there is exactly one copy of each and it is never stale by
 * accident.
 */

const SESSION_HINT_KEY = 'jrx.session.hint';

export type SessionStatus = 'unknown' | 'signed-out' | 'signed-in';

type AuthState = {
  status: SessionStatus;
  user: User | null;
  profile: UserProfile | null;
  /** Set when a session ends unexpectedly so the sign-in screen can explain why. */
  expiredNotice: string | null;
  /**
   * The server's report on the confirmation email from the most recent registration.
   * Null once handled — it exists so the screen after sign-up states what actually
   * happened rather than assuming a message arrived.
   */
  lastVerification: EmailVerificationStatus | null;

  hydrate: () => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  /** Records a confirmation the app has just observed, so banners disappear at once. */
  markEmailVerified: (verifiedAt: string) => void;
  signOut: () => Promise<void>;
  setIdentity: (user: User, profile: UserProfile | null) => void;
  clearExpiredNotice: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  user: null,
  profile: null,
  expiredNotice: null,
  lastVerification: null,

  async hydrate() {
    // A stored refresh token — or, in demo mode, a stored hint — means we can try to
    // restore the session without showing sign-in first.
    const [refreshToken, hint] = await Promise.all([
      secureStorage.get(SecureKeys.refreshToken),
      AsyncStorage.getItem(SESSION_HINT_KEY),
    ]);

    if (!refreshToken && !hint) {
      set({ status: 'signed-out', user: null, profile: null });
      return;
    }

    try {
      const me = await authService.me();
      set({ status: 'signed-in', user: me.user, profile: me.profile });
    } catch {
      await clearTokens();
      await AsyncStorage.removeItem(SESSION_HINT_KEY);
      set({ status: 'signed-out', user: null, profile: null });
    }
  },

  async signIn(input) {
    const session = await authService.login(input);
    await AsyncStorage.setItem(SESSION_HINT_KEY, '1');
    set({
      status: 'signed-in',
      user: session.user,
      profile: session.profile,
      expiredNotice: null,
    });
  },

  async signUp(input) {
    const session = await authService.register(input);
    await AsyncStorage.setItem(SESSION_HINT_KEY, '1');
    set({
      status: 'signed-in',
      user: session.user,
      profile: session.profile,
      expiredNotice: null,
      // Kept so the screen after registration can say what really happened to the
      // message, rather than assuming one arrived.
      lastVerification: session.emailVerification ?? null,
    });
  },

  markEmailVerified(verifiedAt) {
    const user = get().user;
    if (!user) return;
    set({ user: { ...user, emailVerifiedAt: verifiedAt }, lastVerification: null });
  },

  async signOut() {
    try {
      await authService.logout();
    } catch (error) {
      // Sign-out must always succeed locally, even if the server call did not.
      toAppError(error);
    } finally {
      await AsyncStorage.removeItem(SESSION_HINT_KEY);
      set({ status: 'signed-out', user: null, profile: null });
    }
  },

  setIdentity(user, profile) {
    set({ user, profile, status: 'signed-in' });
  },

  clearExpiredNotice() {
    set({ expiredNotice: null });
  },
}));

/** Wired once at app start: a dead refresh token drops straight back to sign-in. */
export function installSessionExpiryHandler(): void {
  setSessionExpiredHandler(() => {
    void AsyncStorage.removeItem(SESSION_HINT_KEY);
    useAuthStore.setState({
      status: 'signed-out',
      user: null,
      profile: null,
      expiredNotice: 'Your session expired. Please sign in again.',
    });
  });
}

export const useIsAdmin = () => useAuthStore((state) => state.user?.role === 'ADMIN');
