import { create } from 'zustand';
import { Network } from '@capacitor/network';

interface NetworkState {
    isOnline: boolean;
    setOnline: (status: boolean) => void;
    checkConnection: () => Promise<boolean>;
}

// Initial state: check sessionStorage if page was reloaded while offline
const getInitialOnlineStatus = (): boolean => {
    try {
        const saved = sessionStorage.getItem('grip_is_online');
        if (saved !== null) {
            return saved === 'true';
        }
    } catch {
        // ignore
    }
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const useNetworkStore = create<NetworkState>((set) => ({
    isOnline: getInitialOnlineStatus(),
    setOnline: (isOnline: boolean) => {
        try {
            sessionStorage.setItem('grip_is_online', String(isOnline));
        } catch {
            // ignore
        }
        set({ isOnline });
    },
    checkConnection: async () => {
        try {
            // 1. Native Capacitor Network check
            const status = await Network.getStatus();
            if (!status.connected) {
                useNetworkStore.getState().setOnline(false);
                return false;
            }

            // 2. Active ping check to verify actual internet access
            const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
            const pingUrl = apiUrl ? `${apiUrl.replace(/\/api\/v1\/?$/, '')}/health` : '/favicon.ico';
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            await fetch(`${pingUrl}?_t=${Date.now()}`, {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            useNetworkStore.getState().setOnline(true);
            return true;
        } catch {
            useNetworkStore.getState().setOnline(false);
            return false;
        }
    },
}));

// Setup global network listeners once
let isInitialized = false;

export function initNetworkMonitoring() {
    if (isInitialized || typeof window === 'undefined') return;
    isInitialized = true;

    // 1. Initial check using Capacitor Network (essential for Android APK)
    Network.getStatus().then((status) => {
        useNetworkStore.getState().setOnline(status.connected);
    }).catch(() => {
        // fallback to navigator.onLine if Capacitor fails
        useNetworkStore.getState().setOnline(navigator.onLine);
    });

    // 2. Native Capacitor listener (triggers on Android when cellular/wifi toggles)
    Network.addListener('networkStatusChange', (status) => {
        useNetworkStore.getState().setOnline(status.connected);
    });

    // 3. Browser fallback listeners
    window.addEventListener('online', () => {
        useNetworkStore.getState().setOnline(true);
    });
    window.addEventListener('offline', () => {
        useNetworkStore.getState().setOnline(false);
    });
}
