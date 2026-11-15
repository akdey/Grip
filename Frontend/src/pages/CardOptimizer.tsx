import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { GraceOptimizerView } from '../features/credit-cards/GraceOptimizerView';
import { haptics } from '../lib/haptics';

const CardOptimizer: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen text-primary pb-24">
            <header className="px-4 py-6 flex items-center justify-between border-b border-border-subtle sticky top-0 bg-page/80 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            haptics.selection();
                            navigate(-1);
                        }}
                        className="w-10 h-10 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center hover:bg-surface-hover text-text-muted hover:text-primary transition-all active:scale-95"
                        aria-label="Back"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center border border-accent-border text-accent-text">
                        <CreditCard size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black uppercase tracking-tight text-primary heading-apple">
                                Card Float Optimizer
                            </h1>
                            <span className="badge-neutral px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                                Beta
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
                            Interest-Free Grace Period Engine
                        </p>
                    </div>
                </div>
            </header>

            <div className="px-4 py-6 max-w-4xl mx-auto">
                <GraceOptimizerView />
            </div>
        </div>
    );
};

export default CardOptimizer;
