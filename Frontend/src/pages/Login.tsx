import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';

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
            navigate('/');
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
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-enter">
                <div className="text-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-indigo-500 mb-2">
                        {import.meta.env.VITE_APP_NAME || 'Grip'}
                    </h1>
                    <p className="text-gray-400 text-sm italic">{import.meta.env.VITE_APP_TAGLINE || 'Money that minds itself.'}</p>
                </div>

                <Card className="space-y-6">
                    <div className="flex justify-center border-b border-white/5 pb-4 mb-4">
                        {mode !== 'OTP' && (
                            <div className="flex space-x-4 text-sm">
                                <button
                                    onClick={() => { setMode('LOGIN'); setError(''); }}
                                    className={`pb-1 ${mode === 'LOGIN' ? 'text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => { setMode('REGISTER'); setError(''); }}
                                    className={`pb-1 ${mode === 'REGISTER' ? 'text-indigo-400 font-medium' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    Sign Up
                                </button>
                            </div>
                        )}
                        {mode === 'OTP' && (
                            <span className="text-indigo-400 font-medium text-sm">Verification</span>
                        )}
                    </div>

                    <form onSubmit={mode === 'LOGIN' ? handleLogin : mode === 'REGISTER' ? handleRegister : handleVerifyOtp} className="space-y-6">

                        {mode !== 'OTP' && (
                            <>
                                <Input
                                    label="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                                <Input
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                            </>
                        )}

                        {mode === 'OTP' && (
                            <div className='space-y-4'>
                                <p className='text-sm text-gray-400 text-center'>{message}</p>
                                <Input
                                    label="Verification Code"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="123456"
                                    required
                                />
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            {mode === 'LOGIN' ? 'Sign In' : mode === 'REGISTER' ? 'Next' : 'Verify & Login'}
                        </Button>

                        {mode === 'OTP' && (
                            <div className="text-center">
                                <button type="button" onClick={() => setMode('REGISTER')} className="text-xs text-gray-500 hover:text-indigo-400">
                                    Back to Sign Up
                                </button>
                            </div>
                        )}
                    </form>
                </Card>

                <div className="flex justify-center gap-6 pt-4">
                    <button
                        onClick={() => navigate('/privacy')}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        Privacy
                    </button>
                    <button
                        onClick={() => navigate('/terms')}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        Terms
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
