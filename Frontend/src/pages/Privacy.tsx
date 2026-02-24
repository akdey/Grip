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
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">01. Data Governance & Collection</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            {import.meta.env.VITE_APP_NAME || 'Grip'} operates on a foundation of absolute transparency and data sovereignty. We collect information necessary to provide the services offered by the application, focusing on financial tracking and intelligence.
                        </p>
                        <p>
                            <strong>Information We Collect:</strong> We collect transaction data, bank notification details, and investment statement information provided by you or accessed through authorized connections. Personal Identifiable Information (PII) like names and email addresses are used strictly for account management and security.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-orange-500 h-6 bg-orange-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">02. Google User Data Usage</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            When you connect your Gmail account, {import.meta.env.VITE_APP_NAME || 'Grip'} requests access to your emails via OAuth 2.0 Restricted Scopes.
                        </p>
                        <p>
                            <strong>How We Use Google Data:</strong> We strictly search for and process only bank-related notifications, credit card alerts, and financial statements. This data is used solely to:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Automatically populate your financial dashboard with transaction details.</li>
                            <li>Detect and categorize your spending across various bank accounts and cards.</li>
                            <li>Extract investment confirmations to update your portfolio snapshots.</li>
                        </ul>
                        <p>
                            <strong>AI Role (Data Extraction Only):</strong> We use Large Language Models (LLMs) strictly for the structural extraction of transaction data from raw, messy email text. <u>AI does not handle your financial calculations or money management logic.</u>
                        </p>
                        <p>
                            <strong>Restricted Scope Compliance:</strong> Our use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-orange-400 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
                        </p>
                        <p>
                            <strong>Data Sharing:</strong> We <u>do not</u> share, sell, or trade your Google user data with third-party marketing tools, advertisers, or any external entities. Data extracted is scoped strictly to your individual account.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-purple-500 h-6 bg-purple-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">03. Data Storage & Security</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            <strong>Storage:</strong> Your financial data is stored in secured databases. Sensitive information is isolated and encrypted.
                        </p>
                        <p>
                            <strong>Security Measures:</strong> We employ end-to-end TLS encryption for data in transit. At rest, sensitive fields are secured using industry-standard AES-256 encryption. Authentication is handled via JWT with salted cryptographic hashing for passwords.
                        </p>
                        <p>
                            The "Privacy Shield" feature on the dashboard ensures that your capital metrics are obfuscated via CSS-level blurring when operating in public environments.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-emerald-500 h-6 bg-emerald-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">04. Financial Intelligence Engine</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            Our logic-based intelligence engine performs rigorous financial calculations to provide variance analysis and "Safe to Spend" metrics.
                        </p>
                        <p>
                            <strong>Safe-to-Spend Calculation:</strong> This is a deterministic mathematical calculation based on your current liquid balance minus unpaid bills, projected recurring commitments, and unbilled credit card exposure. It includes a safety buffer based on your actual 30-day discretionary spending averages.
                        </p>
                        <p>
                            <strong>Privacy Sanitization:</strong> All processing is containerized and scoped strictly to your account UUID. We use local regex-based sanitization tools to mask highly sensitive PII (like full account numbers or UPI IDs) <u>before</u> any extraction or analysis occurs.
                        </p>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1 text-blue-500 h-6 bg-blue-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[4px] text-white">05. User Control & Deletion</h2>
                    </div>
                    <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-medium">
                        <p>
                            You maintain full control over your data. You can disconnect your Gmail account at any time via the "Gmail Sync" settings. Upon request or account deletion, all associated financial records and Google-derived data will be permanently purged from our active databases.
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

export default Privacy;
