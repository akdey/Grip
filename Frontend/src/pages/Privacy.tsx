import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy: React.FC = () => {
    const navigate = useNavigate();
    const canGoBack = window.history.length > 2;

    return (
        <div className="min-h-screen text-primary pb-10 overflow-x-hidden relative">
            <header className="px-5 pt-safe pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-page/80 backdrop-blur-3xl z-30 border-b border-border-subtle">
                {canGoBack && (
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary active:scale-90 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1 className="text-xl font-black tracking-tight uppercase text-primary">Privacy Policy</h1>
            </header>

            <div className="px-5 py-12 max-w-2xl mx-auto space-y-12 animate-enter">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 rounded-full bg-accent" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-primary">01. Data Governance & Collection</h2>
                    </div>
                    <div className="space-y-4 text-sm text-text-secondary leading-relaxed font-medium">
                        <p>
                            {import.meta.env.VITE_APP_NAME || 'Grip'} operates on a foundation of absolute transparency and data sovereignty. We collect information necessary to provide the services offered by the application, focusing on financial tracking and intelligence.
                        </p>
                        <p>
                            <strong className="text-primary">Information We Collect:</strong> We collect transaction data, bank notification details, and investment statement information provided by you or accessed through authorized connections. Personal Identifiable Information (PII) like names and email addresses are used strictly for account management and security.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 rounded-full bg-accent" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-primary">02. Google User Data Usage</h2>
                    </div>
                    <div className="space-y-4 text-sm text-text-secondary leading-relaxed font-medium">
                        <p>
                            When you connect your Gmail account, {import.meta.env.VITE_APP_NAME || 'Grip'} requests access to your emails via OAuth 2.0 Restricted Scopes.
                        </p>
                        <p>
                            <strong className="text-primary">How We Use Google Data:</strong> We strictly search for and process only bank-related notifications, credit card alerts, and financial statements. This data is used solely to populate your dashboard and automate your financial management.
                        </p>
                        <p>
                            <strong className="text-primary">AI Role & Restrictions:</strong> We use Large Language Models (LLMs) strictly for structural extraction of transaction data.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong className="text-primary">No Training:</strong> We do not use Google user data to train, retrain, or improve AI/ML models.</li>
                            <li><strong className="text-primary">No Decisions:</strong> AI does not handle your financial calculations or money management logic.</li>
                        </ul>
                        <p>
                            <strong className="text-primary">Restricted Scope Compliance:</strong> Our use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary">Google API Services User Data Policy</a>, including the Limited Use requirements.
                        </p>
                        <p>
                            <strong className="text-primary">Data Sharing:</strong> We <u>do not</u> share, sell, or trade your Google user data with third-party marketing tools, advertisers, or any external entities.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 rounded-full bg-accent" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-primary">03. Data Storage & Security</h2>
                    </div>
                    <div className="space-y-4 text-sm text-text-secondary leading-relaxed font-medium">
                        <p>
                            <strong className="text-primary">Storage:</strong> Your financial data is stored in secured databases. Sensitive information is isolated and encrypted.
                        </p>
                        <p>
                            <strong className="text-primary">Security Measures:</strong> We employ end-to-end TLS encryption for data in transit. At rest, sensitive fields are secured using industry-standard AES-256 encryption. Authentication is handled via JWT with salted cryptographic hashing for passwords.
                        </p>
                        <p>
                            The "Privacy Shield" feature on the dashboard ensures that your capital metrics are obfuscated via CSS-level blurring when operating in public environments.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 rounded-full bg-accent" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-primary">04. Privacy Shield & Sanitization</h2>
                    </div>
                    <div className="space-y-4 text-sm text-text-secondary leading-relaxed font-medium">
                        <p>
                            We implement **Privacy-by-Design** via a local sanitization layer that operates <u>before</u> any data is processed by our extraction engines.
                        </p>
                        <p>
                            <strong className="text-primary">Local PII Masking:</strong> Our system automatically detects and masks highly sensitive fields including:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Full Credit/Debit Card numbers (Masked to &lt;CARD&gt;)</li>
                            <li>Personal Phone numbers and Emails</li>
                            <li>Bank Account numbers and UPI IDs</li>
                            <li>National IDs (PAN, Aadhaar)</li>
                        </ul>
                        <p>
                            This ensures that even during internal processing, your most sensitive identifiers are never exposed or stored in raw format outside of the original encrypted source.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-5 rounded-full bg-accent" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-primary">05. User Control & Deletion</h2>
                    </div>
                    <div className="space-y-4 text-sm text-text-secondary leading-relaxed font-medium">
                        <p>
                            You maintain full control over your data. You can disconnect your Gmail account at any time via the "Gmail Sync" settings. Upon request or account deletion, all associated financial records and Google-derived data will be permanently purged from our active databases.
                        </p>
                    </div>
                </section>

                <footer className="mt-20 pt-10 border-t border-border-subtle text-center space-y-6">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[8px] text-text-muted font-bold uppercase tracking-[4px]">Designed & Engineered by</span>
                        <a
                            href="https://portfolio.akdey.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-black text-primary hover:opacity-80 transition-all duration-300 border-b border-border-subtle pb-1"
                        >
                            AMIT KUMAR DEY
                        </a>
                    </div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Version 1.0.1 • © 2026 {import.meta.env.VITE_APP_NAME || 'Grip'} Intelligence</p>
                </footer>
            </div>
        </div>
    );
};

export default Privacy;
