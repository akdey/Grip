import { Logo } from '../components/ui/Logo';
import { useAuthStore } from '../lib/store';
import { Shield, Zap, TrendingUp, Mail, Lock, Calendar, BarChart3, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useEffect } from 'react';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // If authenticated, skip home and land directly on dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 font-sans">
            {/* Header / Nav */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-3xl">
                <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Logo size={32} />
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600">
                                {import.meta.env.VITE_APP_NAME || 'GRIP'}
                            </span>
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-[2px]">{import.meta.env.VITE_APP_TAGLINE || 'GRIP'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {isAuthenticated ? (
                            <Button onClick={() => navigate('/dashboard')} className="rounded-xl font-bold bg-white/5 border-white/10 hover:bg-white/10 h-10 px-6">
                                Dashboard
                            </Button>
                        ) : (
                            <>
                                <button onClick={() => navigate('/login')} className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                                    Sign In
                                </button>
                                <Button onClick={() => navigate('/login')} className="bg-gradient-to-r from-emerald-500 to-cyan-600 border-none rounded-xl text-[10px] font-black uppercase tracking-widest px-6 h-10">
                                    Get Started
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-40 pb-20">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center space-y-10 max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10 text-[9px] font-black uppercase tracking-[4px] text-gray-400 animate-enter">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Next-Gen Financial Engine
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white animate-enter">
                            Money that <br className="hidden md:block" />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600">minds itself.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-gray-500 leading-relaxed font-medium max-w-2xl mx-auto animate-enter" style={{ animationDelay: '0.1s' }}>
                            Zero manual entry. Infinite intelligence. Grip syncs your life and builds a fortress around your future.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6 animate-enter" style={{ animationDelay: '0.2s' }}>
                            <Button className="h-16 px-12 text-sm font-black uppercase tracking-[3px] rounded-2xl w-full sm:w-auto bg-white text-black hover:bg-gray-200" onClick={() => navigate('/login')}>
                                Join the Hub
                            </Button>
                            <Link to="/privacy" className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2 group">
                                <Lock size={14} className="group-hover:text-emerald-400 transition-colors" />
                                Privacy First Protocol
                            </Link>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-40">
                        {[
                            {
                                icon: <Mail size={24} className="text-emerald-400" />,
                                title: "Gmail Ingress",
                                description: "Proprietary AI filters your emails to extract transaction data with zero effort. No bank logins needed."
                            },
                            {
                                icon: <Fingerprint size={24} className="text-cyan-400" />,
                                title: "Surety Detection",
                                description: "Our engine automatically identifies recurring burdens and subscription drift across all accounts."
                            },
                            {
                                icon: <Lock size={24} className="text-blue-500" />,
                                title: "Fund Freeze",
                                description: "The system identifies upcoming commitments and 'freezes' the capital mentally to ensure zero default risk."
                            },
                            {
                                icon: <Calendar size={24} className="text-purple-500" />,
                                title: "Wealth Optimizer",
                                description: "Wealth Intelligence calculates the exact market windows to execute SIPs for maximum historical yield."
                            },
                            {
                                icon: <BarChart3 size={24} className="text-amber-500" />,
                                title: "Safe-to-Spend",
                                description: "A dynamic credit-driven limit that tells you exactly how much capital can be deployed without affecting goals."
                            },
                            {
                                icon: <Zap size={24} className="text-rose-500" />,
                                title: "Llama-3 Integration",
                                description: "Core intelligence powered by fine-tuned LLMs for razor-sharp categorization and spend reasoning."
                            }
                        ].map((f, i) => (
                            <Card key={i} className="p-8 border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-all group rounded-[2.5rem] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/[0.02] to-transparent -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
                                <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                                    {f.icon}
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 italic group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed font-medium">{f.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-24 mt-40 bg-gradient-to-b from-transparent to-black/40">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-16 mb-20">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <Logo size={40} />
                                <span className="text-2xl font-black tracking-tighter uppercase italic">{import.meta.env.VITE_APP_NAME || 'GRIP'}<span className="text-gray-700">.</span></span>
                            </div>
                            <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[4px] max-w-xs leading-loose">
                                {import.meta.env.VITE_APP_TAGLINE}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-12 sm:gap-24">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[5px]">Legal</h4>
                                <ul className="space-y-4">
                                    <li><Link to="/privacy" className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Privacy</Link></li>
                                    <li><Link to="/terms" className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Terms</Link></li>
                                </ul>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[5px]">Connect</h4>
                                <ul className="space-y-4">
                                    <li><a href="mailto:amitkr.dey1998@gmail.com" className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Contact</a></li>
                                    <li><a href="https://portfolio.akdey.vercel.app" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Support</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <span className="text-[8px] text-gray-700 font-bold uppercase tracking-[4px]">Designed & Engineered by</span>
                            <a
                                href="https://portfolio.akdey.vercel.app"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-black text-white hover:text-cyan-400 transition-all duration-300 border-b border-white/10 pb-1 uppercase tracking-widest"
                            >
                                AMIT KUMAR DEY
                            </a>
                        </div>
                        <p className="text-[9px] font-black text-gray-800 uppercase tracking-[6px]">
                            Version 1.0.0 • © 2026 Grip Intelligence
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Home;
