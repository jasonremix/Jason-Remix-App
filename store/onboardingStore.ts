import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ONBOARDING_KEY = 'jrx.onboarding.completed.v1';

type OnboardingState = {
  ready: boolean;
  completed: boolean;
  hydrate: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
};

/** Tracks whether the five-screen introduction has been seen on this device. */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  ready: false,
  completed: false,

  async hydrate() {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ completed: value === '1', ready: true });
    } catch {
      set({ completed: false, ready: true });
    }
  },

  async complete() {
    set({ completed: true });
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  },

  async reset() {
    set({ completed: false });
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  },
}));
