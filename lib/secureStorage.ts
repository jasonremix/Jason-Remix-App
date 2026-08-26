import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { logger } from './logger';

/**
 * Storage for credentials.
 *
 * Native platforms use the Keychain / Keystore via expo-secure-store. On web there is
 * no equivalent guarantee, so tokens are kept in memory only for the lifetime of the
 * tab rather than being written to `localStorage`, where any script could read them.
 */

export const SecureKeys = {
  accessToken: 'jrx.auth.access',
  refreshToken: 'jrx.auth.refresh',
  accessTokenExpiry: 'jrx.auth.expiry',
  spotifyState: 'jrx.spotify.state',
  spotifyVerifier: 'jrx.spotify.verifier',
} as const;

export type SecureKey = (typeof SecureKeys)[keyof typeof SecureKeys];

const memoryStore = new Map<string, string>();
const useMemoryStore = Platform.OS === 'web';

export const secureStorage = {
  async get(key: SecureKey): Promise<string | null> {
    if (useMemoryStore) return memoryStore.get(key) ?? null;
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      // Never log the key's contents — only that a read failed.
      logger.warn('secure storage read failed');
      return null;
    }
  },

  async set(key: SecureKey, value: string): Promise<void> {
    if (useMemoryStore) {
      memoryStore.set(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      logger.warn('secure storage write failed');
    }
  },

  async remove(key: SecureKey): Promise<void> {
    if (useMemoryStore) {
      memoryStore.delete(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      logger.warn('secure storage delete failed');
    }
  },

  /** Wipes every credential — used on sign-out and account deletion. */
  async clearAll(): Promise<void> {
    await Promise.all(Object.values(SecureKeys).map((key) => secureStorage.remove(key)));
  },
};
