import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import { Logo } from '../components/ui/Logo';

// Declare google for typescript
declare global {
    interface Window {
        google: any;
    }
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'OTP'>('LOGIN');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Initialize Google Login + Sync Fast Track
    useEffect(() => {
        if (window.google) {
            const client = window.google.accounts.oauth2.initCodeClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '79555107768-4qevfrm1r070pk51thefg0qmo1nnb647.apps.googleusercontent.com',
                scope: 'openid profile email https://www.googleapis.com/auth/gmail.readonly',
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
                    <button type="button" class="w-full flex items-center justify-center gap-3 bg-white text-black h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" class="w-5 h-5" alt="G" />
                        Authorize All-in-One
                    </button>
                `;
            }
        }
    }, [mode]);

    const handleOneTapSync = async (code: string) => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.post('/auth/google/one-tap', {
                code,
                redirect_uri: 'postmessage'
            });
            const { access_token } = response.data;
            login({ id: 'temp-id', email: 'verified@google', is_active: true }, access_token);
            navigate('/dashboard');
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
            login({ id: 'temp-id', email, is_active: true }, access_token);
            navigate('/dashboard');
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
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/verify-otp', { email, otp });
            const { access_token } = response.data;
            login({ id: 'temp-id', email, is_active: true }, access_token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-4 bg-[#050505] text-white selection:bg-cyan-500/30 overflow-hidden">
            <div className="w-full max-w-md space-y-8 animate-enter flex flex-col items-stretch">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <Logo size={64} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600">
                            {import.meta.env.VITE_APP_NAME || 'Grip'}
                        </h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px]">{import.meta.env.VITE_APP_TAGLINE}</p>
                    </div>
                </div>

                <Card className="bg-white/[0.03] border-white/10 rounded-[2rem] p-8 shadow-2xl">
                    <div className="flex justify-center border-b border-white/5 pb-4 mb-6">
                        {mode !== 'OTP' && (
                            <div className="flex space-x-8 text-[9px] font-black uppercase tracking-widest">
                                <button
                                    onClick={() => { setMode('LOGIN'); setError(''); }}
                                    className={`pb-1 transition-all ${mode === 'LOGIN' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                    Login
                                </button>
                                <button
                                    onClick={() => { setMode('REGISTER'); setError(''); }}
                                    className={`pb-1 transition-all ${mode === 'REGISTER' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                    Enlist
                                </button>
                            </div>
                        )}
                        {mode === 'OTP' && (
                            <span className="text-cyan-400 font-black text-[9px] uppercase tracking-widest">Command Verification</span>
                        )}
                    </div>

                    <form onSubmit={mode === 'LOGIN' ? handleLogin : mode === 'REGISTER' ? handleRegister : handleVerifyOtp} className="space-y-6">

                        {mode !== 'OTP' && (
                            <div className="space-y-4">
                                <Input
                                    label="Access Identification"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="operator@grip.hub"
                                    required
                                    className="bg-white/[0.02] border-white/5 h-12"
                                />
                                <Input
                                    label="Security Cipher"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="bg-white/[0.02] border-white/5 h-12"
                                />
                            </div>
                        )}

                        {mode === 'OTP' && (
                            <div className='space-y-4'>
                                <p className='text-[9px] font-bold text-gray-400 text-center uppercase tracking-widest'>{message}</p>
                                <Input
                                    label="Verification Code"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="123456"
                                    required
                                    className="bg-white/[0.02] border-white/5 h-12"
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold uppercase tracking-widest text-center">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-12 rounded-xl bg-white text-black font-black uppercase tracking-[2px] text-[10px] hover:bg-gray-200" isLoading={isLoading}>
                            {mode === 'LOGIN' ? 'Authorize' : mode === 'REGISTER' ? 'Register Unit' : 'Override & Sync'}
                        </Button>

                        {mode !== 'OTP' && (
                            <div className="space-y-4">
                                <div className="relative flex items-center justify-center">
                                    <div className="border-t border-white/5 w-full"></div>
                                    <span className="bg-[#050505] px-4 text-[7px] font-black uppercase tracking-[3px] text-gray-700 absolute">OR</span>
                                </div>

                                <div id="googleSyncBtn" className="w-full flex justify-center !rounded-xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity"></div>
                            </div>
                        )}

                        {mode === 'OTP' && (
                            <div className="text-center">
                                <button type="button" onClick={() => setMode('REGISTER')} className="text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-cyan-400 transition-colors">
                                    Return to Registration
                                </button>
                            </div>
                        )}
                    </form>
                </Card>

                <div className="flex flex-col items-center gap-6">
                    <div className="flex gap-8">
                        <button
                            onClick={() => navigate('/privacy')}
                            className="text-[8px] font-black uppercase tracking-[3px] text-gray-600 hover:text-white transition-colors"
                        >
                            Privacy
                        </button>
                        <button
                            onClick={() => navigate('/terms')}
                            className="text-[8px] font-black uppercase tracking-[3px] text-gray-600 hover:text-white transition-colors"
                        >
                            Terms
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-1 opacity-60">
                        <span className="text-[6px] text-gray-700 font-bold uppercase tracking-[3px]">Engineered by</span>
                        <a
                            href="https://portfolio.akdey.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[8px] font-black text-white hover:text-cyan-400 transition-all uppercase tracking-widest"
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
