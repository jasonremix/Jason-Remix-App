// AsyncStorage has no native module under Jest; the package ships a mock for exactly this.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/**
 * expo-crypto is a native module. The stand-in below is deterministic so PKCE tests can
 * assert on exact values — it is a test double, never used by the app.
 */
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64', HEX: 'hex' },
  getRandomBytesAsync: async (length: number) =>
    Uint8Array.from({ length }, (_, index) => (index * 37 + 11) % 256),
  digestStringAsync: async (_algorithm: string, data: string) => {
    const { createHash } = require('node:crypto');
    return createHash('sha256').update(data).digest('base64');
  },
  randomUUID: () => '00000000-0000-4000-8000-000000000000',
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
  };
});
