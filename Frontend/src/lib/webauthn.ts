import {
    startRegistration,
    startAuthentication,
    platformAuthenticatorIsAvailable,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { api } from './api';

export interface BiometricsStatus {
    supported: boolean;
    platformAvailable: boolean;
    hasBiometrics: boolean;
    deviceType: string;
    devices?: Array<{ id: string; device_name: string; created_at: string }>;
}

/**
 * Detects the device platform and returns the intuitive biometric label
 * (e.g. "Touch ID", "Face ID", "Fingerprint", "Windows Hello")
 */
export function getDeviceBiometricName(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
        return 'Face ID / Touch ID';
    }
    if (/Macintosh|Mac OS X/.test(ua)) {
        return 'Touch ID';
    }
    if (/Android/.test(ua)) {
        return 'Fingerprint';
    }
    if (/Windows/.test(ua)) {
        return 'Windows Hello';
    }
    return 'Fingerprint';
}

let cachedSupportPromise: Promise<{ supported: boolean; platformAvailable: boolean }> | null = null;

/**
 * Checks whether the current device supports hardware biometrics
 * Automatically adapts between Native Capacitor (Android/iOS) and WebAuthn (Browsers)
 */
export async function checkBiometricsSupport(): Promise<{ supported: boolean; platformAvailable: boolean }> {
    if (cachedSupportPromise) {
        return cachedSupportPromise;
    }
    cachedSupportPromise = (async () => {
        try {
            // 1. Native Capacitor Android/iOS Check
            if (Capacitor.isNativePlatform()) {
                const info = await BiometricAuth.checkBiometry();
                return {
                    supported: info.biometryType !== BiometryType.none,
                    platformAvailable: info.isAvailable,
                };
            }

            // 2. Standard Web Browser (WebAuthn)
            const supported = browserSupportsWebAuthn();
            if (!supported) return { supported: false, platformAvailable: false };

            const platformAvailable = await platformAuthenticatorIsAvailable();
            return { supported, platformAvailable };
        } catch (e) {
            console.warn('Biometric support check error:', e);
            return { supported: false, platformAvailable: false };
        }
    })();
    return cachedSupportPromise;
}

/**
 * Checks if the logged-in user has registered biometrics on this account
 */
export async function getBiometricsStatus(): Promise<BiometricsStatus> {
    const support = await checkBiometricsSupport();
    const deviceType = getDeviceBiometricName();
    if (!support.platformAvailable) {
        return { ...support, hasBiometrics: false, deviceType };
    }

    try {
        if (Capacitor.isNativePlatform()) {
            const isEnrolled = localStorage.getItem('grip_biometrics_enrolled') === 'true';
            return {
                ...support,
                hasBiometrics: isEnrolled,
                deviceType,
                devices: isEnrolled ? [{ id: 'native-device', device_name: 'Android Fingerprint', created_at: new Date().toISOString() }] : []
            };
        }

        const response = await api.get('/auth/biometrics/status');
        const hasBiometrics = !!response.data?.has_biometrics;
        if (hasBiometrics) {
            localStorage.setItem('grip_biometrics_enrolled', 'true');
        }
        return {
            ...support,
            hasBiometrics,
            deviceType,
            devices: response.data?.devices || []
        };
    } catch {
        const localEnrolled = localStorage.getItem('grip_biometrics_enrolled') === 'true';
        return {
            ...support,
            hasBiometrics: localEnrolled,
            deviceType
        };
    }
}

/**
 * Register the device's fingerprint / platform passkey
 */
export async function registerBiometricCredential(deviceName?: string): Promise<{ success: boolean; message?: string }> {
    try {
        // 1. Native Capacitor Android/iOS Flow
        if (Capacitor.isNativePlatform()) {
            await BiometricAuth.authenticate({
                reason: 'Scan your fingerprint to secure Grip',
                androidTitle: 'Grip Biometric Security',
                androidSubtitle: 'Confirm device fingerprint enrollment',
                cancelTitle: 'Cancel',
                allowDeviceCredential: true,
            });
            localStorage.setItem('grip_biometrics_enrolled', 'true');
            localStorage.setItem('grip_enrolled_credential_id', 'native-biometric');
            return { success: true, message: 'Fingerprint registered successfully' };
        }

        // 2. Web WebAuthn Flow
        const clientOrigin = window.location.origin;
        const optionsRes = await api.post('/auth/biometrics/register/options', {}, {
            headers: { 'x-client-origin': clientOrigin }
        });
        const options = optionsRes.data;

        const credential = await startRegistration({ optionsJSON: options });

        const defaultName = deviceName || (
            navigator.userAgent.includes('iPhone') ? 'Apple Face ID / Touch ID' :
            navigator.userAgent.includes('Mac') ? 'Mac Touch ID' :
            navigator.userAgent.includes('Android') ? 'Android Fingerprint' :
            'Device Biometric Sensor'
        );

        const verifyRes = await api.post(
            '/auth/biometrics/register/verify',
            {
                credential,
                device_name: defaultName
            },
            {
                headers: { 'x-client-origin': clientOrigin }
            }
        );

        localStorage.setItem('grip_biometrics_enrolled', 'true');
        if (credential?.id) {
            localStorage.setItem('grip_enrolled_credential_id', credential.id);
        }
        return { success: true, message: verifyRes.data?.message || 'Enrolled successfully' };
    } catch (err: any) {
        console.error('Biometric enrollment failed:', err);
        throw new Error(err?.response?.data?.detail || err?.message || 'Biometric enrollment failed');
    }
}

/**
 * Unlock sensitive area using native fingerprint (In-App Security Access)
 */
export async function unlockWithBiometrics(): Promise<boolean> {
    try {
        // 1. Native Capacitor Android/iOS Flow
        if (Capacitor.isNativePlatform()) {
            await BiometricAuth.authenticate({
                reason: 'Scan your fingerprint to unlock the Wealth Vault',
                androidTitle: 'Unlock Wealth Vault',
                androidSubtitle: 'Grip Biometric Verification',
                cancelTitle: 'Use Password',
                allowDeviceCredential: true,
            });
            return true;
        }

        // 2. Web WebAuthn Flow
        const clientOrigin = window.location.origin;
        const optionsRes = await api.post('/auth/biometrics/unlock/options', {}, {
            headers: { 'x-client-origin': clientOrigin }
        });
        const options = optionsRes.data;

        const credential = await startAuthentication({ optionsJSON: options });

        const verifyRes = await api.post(
            '/auth/biometrics/unlock/verify',
            { credential },
            {
                headers: { 'x-client-origin': clientOrigin }
            }
        );
        return !!verifyRes.data?.valid;
    } catch (err: any) {
        console.error('Biometric unlock failed:', err);
        throw new Error(err?.response?.data?.detail || err?.message || 'Biometric verification failed');
    }
}

/**
 * Sign in using native fingerprint / Passkey (Login Page)
 */
export async function loginWithBiometrics(email?: string): Promise<{
    access_token: string;
    token_type: string;
    email: string;
    full_name?: string;
}> {
    try {
        // 1. Native Capacitor Android/iOS Flow
        if (Capacitor.isNativePlatform()) {
            await BiometricAuth.authenticate({
                reason: 'Scan fingerprint to log in to Grip',
                androidTitle: 'Grip Biometric Login',
                cancelTitle: 'Cancel',
                allowDeviceCredential: true,
            });
            // Native platform token retrieval from store
            const token = localStorage.getItem('grip_token') || sessionStorage.getItem('grip_token');
            const savedEmail = localStorage.getItem('grip_last_email') || email || '';
            if (token) {
                return {
                    access_token: token,
                    token_type: 'bearer',
                    email: savedEmail,
                };
            }
        }

        // 2. Web WebAuthn Flow
        const clientOrigin = window.location.origin;
        const cachedEmail = localStorage.getItem('grip_enrolled_email') || localStorage.getItem('grip_last_email');
        const cachedCredId = localStorage.getItem('grip_enrolled_credential_id');
        const targetEmail = email?.trim() || cachedEmail || null;

        const optionsRes = await api.post(
            '/auth/biometrics/login/options',
            {
                email: targetEmail,
                credential_id: cachedCredId || null
            },
            {
                headers: { 'x-client-origin': clientOrigin }
            }
        );
        const { options, challenge_id } = optionsRes.data;

        const credential = await startAuthentication({ optionsJSON: options });

        const verifyRes = await api.post(
            '/auth/biometrics/login/verify',
            {
                challenge_id,
                credential
            },
            {
                headers: { 'x-client-origin': clientOrigin }
            }
        );

        if (verifyRes.data?.email) {
            localStorage.setItem('grip_last_email', verifyRes.data.email);
            localStorage.setItem('grip_enrolled_email', verifyRes.data.email);
            localStorage.setItem('grip_biometrics_enrolled', 'true');
            if (credential?.id) {
                localStorage.setItem('grip_enrolled_credential_id', credential.id);
            }
        }

        return verifyRes.data;
    } catch (err: any) {
        console.error('Biometric login failed:', err);
        throw new Error(err?.response?.data?.detail || err?.message || 'Biometric login failed');
    }
}
