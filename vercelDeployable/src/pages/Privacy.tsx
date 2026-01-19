import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
    const navigate = useNavigate();
    const canGoBack = window.history.length > 2;

    return (
        <div className="min-h-screen text-white pb-10 overflow-x-hidden relative">
            <header className="px-5 pt-safe pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-[#050505]/80 backdrop-blur-3xl z-30 border-b border-white/[0.05]">
                {canGoBack && (
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-gray-400 active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1 className="text-xl font-black tracking-tight uppercase">Privacy Policy</h1>
            </header>

            <div className="px-5 py-12 max-w-2xl mx-auto space-y-12 animate-enter">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-cyan-500 h-6 bg-cyan-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">01. Data Governance</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            Grip operates on a foundation of absolute transparency and data sovereignty. We exclusively collect telemetry and financial data necessary to generate our proprietary intelligence models.
                        </p>
                        <p>
                            Personal Identifiable Information (PII) is isolated and never exposed to external marketing or advertising networks. Our monetization strategy is service-based, not data-based.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-purple-500 h-6 bg-purple-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">02. Cryptographic Security</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            Your financial fingerprints are protected via end-to-end TLS encryption in transit. At rest, sensitive fields are secured using AES-256 block ciphers. Passwords utilize salted cryptographic hashing algorithms.
                        </p>
                        <p>
                            The "Privacy Shield" feature on the dashboard ensures that your capital metrics are obfuscated via CSS-level blurring when operating in public environments.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-emerald-500 h-6 bg-emerald-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">03. Intelligence Processing</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            Our AI Intelligence Hub processes transaction data to provide variance analysis and "Safe to Spend" projections. This processing is containerized and scoped strictly to your account UUID.
                        </p>
                    </div>
                </section>

                <footer className="mt-20 pt-10 border-t border-white/[0.05] text-center space-y-6">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[8px] text-gray-600 font-bold uppercase tracking-[4px]">Designed & Engineered by</span>
                        <a
                            href="https://portfolio.akdey.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-black text-white hover:text-cyan-400 transition-all duration-300 border-b border-white/10 pb-1"
                        >
                            AMIT KUMAR DEY
                        </a>
                    </div>
                    <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Version 1.0.0 • © 2026 Grip Intelligence</p>
                </footer>
            </div>
        </div>
    );
};

export default Privacy;
