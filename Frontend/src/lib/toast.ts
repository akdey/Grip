import { create } from 'zustand';
import { haptics } from './haptics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 2200,
  info: 2600,
  warning: 4500,
  error: 6000,
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration) => {
    const id = Math.random().toString(36).substring(2, 9);
    const resolvedDuration = duration ?? DEFAULT_DURATIONS[type];

    // Physical haptic trigger
    if (type === 'success') haptics.notification('success');
    else if (type === 'error') haptics.notification('error');
    else if (type === 'warning') haptics.notification('warning');
    else haptics.selection();

    set((state) => ({
      toasts: [...state.toasts.slice(-1), { id, message, type, duration: resolvedDuration }],
    }));

    if (resolvedDuration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, resolvedDuration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'success', duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'error', duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'warning', duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, 'info', duration),
};
