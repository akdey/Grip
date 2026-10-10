import {
    startRegistration,
    startAuthentication,
    platformAuthenticatorIsAvailable,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
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

/**
 * Checks whether the current device supports hardware biometrics (Touch ID / Face ID / Fingerprint)
 */
export async function checkBiometricsSupport(): Promise<{ supported: boolean; platformAvailable: boolean }> {
    try {
        const supported = browserSupportsWebAuthn();
        if (!supported) return { supported: false, platformAvailable: false };

        const platformAvailable = await platformAuthenticatorIsAvailable();
        return { supported, platformAvailable };
    } catch {
        return { supported: false, platformAvailable: false };
    }
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
        const response = await api.get('/auth/biometrics/status');
        const hasBiometrics = !!response.data?.has_biometrics;
        if (hasBiometrics) {
            localStorage.setItem('grip_biometrics_enrolled', 'true');
            if (response.data?.devices && response.data.devices.length > 0) {
                localStorage.setItem('grip_enrolled_credential_id', response.data.devices[0].id);
            }
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
        const clientOrigin = window.location.origin;
        // 1. Fetch registration options from backend
        const optionsRes = await api.post('/auth/biometrics/register/options', {}, {
            headers: { 'x-client-origin': clientOrigin }
        });
        const options = optionsRes.data;

        // 2. Trigger native device fingerprint / biometrics prompt
        const credential = await startRegistration({ optionsJSON: options });

        // 3. Send response to backend for verification & storage
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
        const clientOrigin = window.location.origin;
        // 1. Fetch unlock authentication options
        const optionsRes = await api.post('/auth/biometrics/unlock/options', {}, {
            headers: { 'x-client-origin': clientOrigin }
        });
        const options = optionsRes.data;

        // 2. Trigger native fingerprint prompt
        const credential = await startAuthentication({ optionsJSON: options });

        // 3. Verify assertion with backend
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
        const clientOrigin = window.location.origin;
        const cachedEmail = localStorage.getItem('grip_enrolled_email') || localStorage.getItem('grip_last_email');
        const cachedCredId = localStorage.getItem('grip_enrolled_credential_id');
        const targetEmail = email?.trim() || cachedEmail || null;

        // 1. Fetch login options with any known identifiers for non-resident and resident passkeys
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

        // 2. Trigger native fingerprint prompt
        const credential = await startAuthentication({ optionsJSON: options });

        // 3. Verify assertion & obtain access token
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
