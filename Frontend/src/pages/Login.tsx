import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { Logo } from '../components/ui/Logo';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { haptics } from '../lib/haptics';

// Declare google for typescript
declare global {
    interface Window {
        google: any;
    }
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const { isDark, toggleTheme } = useTheme();
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'OTP'>('LOGIN');

    const [email, setEmail] = useState(() => {
        return localStorage.getItem('grip_last_email') || localStorage.getItem('grip_enrolled_email') || '';
    });
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const completeLogin = (user: { id: string; email: string; is_active: boolean }, token: string) => {
        login(user, token);
        navigate('/dashboard');
    };

    // Initialize Google Login + Sync Fast Track
    useEffect(() => {
        if (window.google) {
            const client = window.google.accounts.oauth2.initCodeClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '79555107768-4qevfrm1r070pk51thefg0qmo1nnb647.apps.googleusercontent.com',
                scope: 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly',
                ux_mode: 'popup',
                callback: async (response: any) => {
                    if (response.code) {
                        handleOneTapSync(response.code);
                    }
                },
            });

            // Re-use current button div or create a custom one
            const btn = document.getElementById("googleSyncBtn");
            if (btn) {
                btn.onclick = () => client.requestCode();
                btn.innerHTML = `
                    <button type="button" class="w-full flex items-center justify-center gap-3 bg-surface hover:bg-surface-hover text-primary border border-border-subtle h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-xs">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" class="w-5 h-5" alt="G" />
                        Continue with Google
                    </button>
                `;
            }
        }
    }, [mode, isDark]);

    const handleOneTapSync = async (code: string) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/google/one-tap', {
                code,
                redirect_uri: 'postmessage'
            });
            const { access_token } = response.data;
            completeLogin({ id: 'temp-id', email: 'verified@google', is_active: true }, access_token);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'One-Tap Sync failed. Please try standard login.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await api.post('/auth/token', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { access_token } = response.data;
            if (email) localStorage.setItem('grip_last_email', email.trim());
            completeLogin({ id: 'temp-id', email, is_active: true }, access_token);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await api.post('/auth/register', { email, password });
            setMode('OTP');
            setMessage('Verification code sent to your email.');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/verify-otp', { email, otp });
            const { access_token } = response.data;
            if (email) localStorage.setItem('grip_last_email', email.trim());
            completeLogin({ id: 'temp-id', email, is_active: true }, access_token);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-page text-primary relative overflow-y-auto">
            {/* Theme Toggle Button */}
            <div className="absolute top-4 right-4 z-20">
                <button
                    onClick={() => {
                        haptics.selection();
                        toggleTheme();
                    }}
                    className="p-2.5 rounded-full bg-surface-subtle border border-border-subtle text-text-muted hover:text-primary hover:bg-surface-hover transition-all active:scale-95 cursor-pointer"
                    title={isDark ? "Switch to light theme" : "Switch to dark theme"}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            <div className="w-full max-w-md space-y-6 animate-enter flex flex-col items-stretch my-auto py-8">
                {/* Brand / Logo */}
                <div className="text-center space-y-3">
                    <div className="flex justify-center">
                        <Logo size={60} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-primary heading-apple">
                            {import.meta.env.VITE_APP_NAME || 'Grip'}
                        </h1>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-[2px]">
                            {import.meta.env.VITE_APP_TAGLINE}
                        </p>
                    </div>
                </div>

                {/* Card Container */}
                <Card className="bg-surface border border-border-subtle rounded-[2rem] p-6 sm:p-8 shadow-xl">
                    {/* Header Tabs */}
                    <div className="flex justify-center border-b border-border-subtle pb-4 mb-6">
                        {mode !== 'OTP' && (
                            <div className="flex space-x-8 text-[9px] font-black uppercase tracking-widest">
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setMode('LOGIN');
                                        setError('');
                                    }}
                                    className={`pb-1 transition-all cursor-pointer ${
                                        mode === 'LOGIN'
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-text-muted hover:text-primary'
                                    }`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setMode('REGISTER');
                                        setError('');
                                    }}
                                    className={`pb-1 transition-all cursor-pointer ${
                                        mode === 'REGISTER'
                                            ? 'text-primary border-b-2 border-primary'
                                            : 'text-text-muted hover:text-primary'
                                    }`}
                                >
                                    Enlist
                                </button>
                            </div>
                        )}
                        {mode === 'OTP' && (
                            <span className="text-primary font-black text-[9px] uppercase tracking-widest">
                                Command Verification
                            </span>
                        )}
                    </div>

                    <form
                        onSubmit={mode === 'LOGIN' ? handleLogin : mode === 'REGISTER' ? handleRegister : handleVerifyOtp}
                        className="space-y-5"
                    >
                        {/* Standard Credential Inputs */}
                        {mode !== 'OTP' && (
                            <div className="space-y-4">
                                <Input
                                    label="Access Identification"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="operator@grip.hub"
                                    required
                                    className="bg-surface-subtle border-border-subtle h-12 text-primary"
                                />
                                <Input
                                    label="Security Cipher"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="bg-surface-subtle border-border-subtle h-12 text-primary"
                                />
                            </div>
                        )}

                        {mode === 'OTP' && (
                            <div className="space-y-4">
                                <p className="text-[9px] font-bold text-text-muted text-center uppercase tracking-widest">
                                    {message}
                                </p>
                                <Input
                                    label="Verification Code"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="123456"
                                    required
                                    className="bg-surface-subtle border-border-subtle h-12 text-primary"
                                />
                            </div>
                        )}

                        {/* Error Alert */}
                        {error && (
                            <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger-border text-status-danger-text text-[9px] font-bold uppercase tracking-widest text-center">
                                {error}
                            </div>
                        )}

                        {/* Primary Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-primary text-text-inverse font-black uppercase tracking-[2px] text-[10px] hover:opacity-90 transition-opacity shadow-sm"
                            isLoading={isLoading}
                        >
                            {mode === 'LOGIN' ? 'Authorize' : mode === 'REGISTER' ? 'Register Unit' : 'Override & Sync'}
                        </Button>

                        {/* OAuth / Google Sync */}
                        {mode !== 'OTP' && (
                            <div className="space-y-4">
                                <div className="relative flex items-center justify-center">
                                    <div className="border-t border-border-subtle w-full"></div>
                                    <span className="bg-surface px-4 text-[7px] font-black uppercase tracking-[3px] text-text-muted absolute">
                                        OR
                                    </span>
                                </div>

                                <div id="googleSyncBtn" className="w-full flex justify-center !rounded-xl overflow-hidden opacity-90 hover:opacity-100 transition-opacity"></div>
                            </div>
                        )}

                        {mode === 'OTP' && (
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setMode('REGISTER')}
                                    className="text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-colors cursor-pointer"
                                >
                                    Return to Registration
                                </button>
                            </div>
                        )}
                    </form>
                </Card>

                {/* Footer Links & Credit */}
                <div className="flex flex-col items-center gap-5 pt-2">
                    <div className="flex gap-8">
                        <button
                            onClick={() => navigate('/privacy')}
                            className="text-[8px] font-black uppercase tracking-[3px] text-text-muted hover:text-primary transition-colors cursor-pointer"
                        >
                            Privacy
                        </button>
                        <button
                            onClick={() => navigate('/terms')}
                            className="text-[8px] font-black uppercase tracking-[3px] text-text-muted hover:text-primary transition-colors cursor-pointer"
                        >
                            Terms
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-1 opacity-70">
                        <span className="text-[6px] text-text-muted font-bold uppercase tracking-[3px]">
                            Engineered by
                        </span>
                        <a
                            href="https://portfolio.akdey.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[8px] font-black text-primary hover:opacity-80 transition-all uppercase tracking-widest"
                        >
                            AMIT KUMAR DEY
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
