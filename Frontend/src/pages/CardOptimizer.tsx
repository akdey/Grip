import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { GraceOptimizerView } from '../features/credit-cards/GraceOptimizerView';
import { haptics } from '../lib/haptics';

const CardOptimizer: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-page text-text-primary pb-40">
            {/* Header */}
            <header className="px-4 py-5 flex items-center justify-between border-b border-border-subtle sticky top-0 bg-page/85 backdrop-blur-3xl z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            haptics.selection();
                            navigate(-1);
                        }}
                        className="w-9 h-9 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center hover:bg-surface-hover text-text-muted hover:text-text-primary transition-all active:scale-95"
                        aria-label="Back"
                    >
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-bold tracking-tight text-text-primary heading-apple">
                                Card Optimizer
                            </h1>
                            <span className="badge-neutral px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                                Beta
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted font-medium">
                            0% Interest Float Maximizer
                        </p>
                    </div>
                </div>
            </header>

            {/* Content Body */}
            <div className="px-4 py-5 max-w-2xl mx-auto">
                <GraceOptimizerView />
            </div>
        </div>
    );
};

export default CardOptimizer;
