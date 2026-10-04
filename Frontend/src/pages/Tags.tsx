import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Plus, Loader2, ChevronRight } from 'lucide-react';
import { useTagsSummary, type TagSummary } from '../features/transactions/hooks';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

const Tags: React.FC = () => {
    const navigate = useNavigate();
    const { data: tags, isLoading } = useTagsSummary();

    return (
        <div className="min-h-screen text-primary pb-24">
            <header className="p-6 flex items-center justify-between sticky top-0 bg-page/80 backdrop-blur-xl z-20 border-b border-border-subtle">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-muted hover:text-primary transition-all active:scale-90">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-primary">Manage Tags</h1>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Organize transactions</p>
                    </div>
                </div>
            </header>

            <div className="p-4 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 text-text-muted animate-spin" />
                    </div>
                ) : !tags || tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20 space-y-4">
                        <Hash size={64} />
                        <p className="font-bold uppercase tracking-widest text-sm text-center">No tags created yet</p>
                        <p className="text-xs text-center max-w-[200px]">Add #tags to your transactions to see them here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tags.map((tag: TagSummary) => (
                            <div
                                key={tag.tag}
                                className="bg-surface-subtle border border-border-subtle rounded-2xl p-4 flex items-center justify-between cursor-default hover:bg-surface-hover transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-surface-pill text-primary flex items-center justify-center">
                                        <Hash size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-primary text-lg lowercase">{tag.tag}</h3>
                                        <p className="text-xs text-text-muted font-medium">
                                            {tag.count} transaction{tag.count !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="font-bold text-primary">
                                            {formatCurrency(Number(tag.amount))}
                                        </p>
                                        <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                                            Total Spent
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tags;
