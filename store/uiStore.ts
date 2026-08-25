import { create } from 'zustand';

/** Transient interface state: the toast queue and the credit-award pulse. */

export type ToastTone = 'neutral' | 'positive' | 'negative';

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

/** A short metallic flash of `+250` after credits are awarded. */
export type CreditPulse = {
  id: string;
  amount: number;
};

type UiState = {
  toasts: Toast[];
  pulse: CreditPulse | null;
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  pulseCredits: (amount: number) => void;
  clearPulse: () => void;
};

let counter = 0;
const nextId = () => `ui-${Date.now()}-${(counter += 1)}`;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  pulse: null,

  showToast(message, tone = 'neutral') {
    const toast: Toast = { id: nextId(), message, tone };
    set((state) => ({ toasts: [...state.toasts, toast] }));
  },

  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },

  pulseCredits(amount) {
    set({ pulse: { id: nextId(), amount } });
  },

  clearPulse() {
    set({ pulse: null });
  },
}));
