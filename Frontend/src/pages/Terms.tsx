import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms: React.FC = () => {
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
                <h1 className="text-xl font-black tracking-tight uppercase">Terms of Service</h1>
            </header>

            <div className="px-5 py-12 max-w-2xl mx-auto space-y-12 animate-enter">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-blue-500 h-6 bg-blue-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">01. Service Provision</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            {import.meta.env.VITE_APP_NAME || 'Grip'} grants you a limited, non-exclusive, non-transferable license to access our proprietary financial intelligence dashboard. You agree to use the service only for lawful personal financial management purposes.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-cyan-400 h-6 bg-cyan-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">02. Synchronization Consent</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            By connecting external email or financial accounts via Google OAuth, you grant {import.meta.env.VITE_APP_NAME || 'Grip'} a limited scope to read and process transaction notifications. This data is processed privately by our internal Intelligence Engine.
                        </p>
                        <p>
                            You may revoke this access at any time through your account settings or directly via your Google Account security dashboard.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-rose-500 h-6 bg-rose-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">03. Liability Limitation</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            {import.meta.env.VITE_APP_NAME || 'Grip'} is an analytics tool. All projections, "Safe to Spend" metrics, and risk assessments are provided "as-is" without warranty. We do not provide licensed financial, tax, or legal advice.
                        </p>
                        <p>
                            We are not liable for incidental or consequential damages resulting from algorithmic errors, data synchronization delays, or unauthorized account access resulting from weak credentials.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-amber-500 h-6 bg-amber-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">04. Account Integrity</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            You are responsible for maintaining the confidentiality of your session tokens and security credentials. Attempting to probe, scan, or test the vulnerability of our Intelligence API is a material breach of this agreement.
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
                    <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Version 1.0.1 • © 2026 {import.meta.env.VITE_APP_NAME || 'Grip'} Intelligence</p>
                </footer>
            </div>
        </div>
    );
};

export default Terms;
