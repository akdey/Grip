import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Loader2, ChevronRight, Search, X, Sparkles, TrendingUp, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { useTagsSummary, type TagSummary } from '../features/transactions/hooks';
import { haptics } from '../lib/haptics';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

type SortOption = 'count' | 'amount' | 'name';

const Tags: React.FC = () => {
    const navigate = useNavigate();
    const { data: tags, isLoading } = useTagsSummary();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('count');

    // Aggregate statistics
    const stats = useMemo(() => {
        if (!tags || tags.length === 0) return { totalTags: 0, totalSpend: 0, topTag: null as TagSummary | null };
        const totalTags = tags.length;
        const totalSpend = tags.reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const topTag = [...tags].sort((a, b) => b.count - a.count)[0] || null;
        return { totalTags, totalSpend, topTag };
    }, [tags]);

    // Filter and sort tags
    const filteredTags = useMemo(() => {
        if (!tags) return [];
        let list = tags.filter((t: TagSummary) =>
            t.tag.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );

        return list.sort((a, b) => {
            if (sortBy === 'amount') return Number(b.amount) - Number(a.amount);
            if (sortBy === 'name') return a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' });
            return b.count - a.count;
        });
    }, [tags, searchQuery, sortBy]);

    const handleTagClick = (tag: string) => {
        haptics.selection();
        navigate(`/transactions?search=${encodeURIComponent(tag)}`);
    };

    return (
        <div className="min-h-screen text-primary pb-28">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between sticky top-0 bg-page/80 backdrop-blur-xl z-20 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            haptics.selection();
                            navigate(-1);
                        }}
                        className="p-2 -ml-2 rounded-xl text-text-muted hover:text-primary hover:bg-surface-hover transition-all active:scale-90 cursor-pointer"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-primary">Tags</h1>
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">
                            Semantic Transaction Metadata
                        </p>
                    </div>
                </div>
                {tags && tags.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface-pill border border-border-subtle text-text-muted">
                        {tags.length} Active
                    </span>
                )}
            </header>

            <div className="p-4 space-y-5 max-w-2xl mx-auto animate-enter">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-16 space-y-3">
                        <Loader2 className="w-8 h-8 text-accent-text animate-spin" />
                        <p className="text-xs text-text-muted font-semibold tracking-wide">Loading tags...</p>
                    </div>
                ) : !tags || tags.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-28 text-center space-y-4 px-6">
                        <div className="w-16 h-16 rounded-3xl bg-surface-pill border border-border-subtle flex items-center justify-center text-text-muted">
                            <Hash size={32} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-primary text-base">No Tags Created Yet</h3>
                            <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                                Add <span className="text-primary font-semibold">#tag</span> to transaction remarks or edit any transaction to organize your spending into custom themes.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Summary Metrics Card */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-1">
                                <div className="flex items-center gap-1.5 text-text-muted">
                                    <Layers size={13} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Tags</span>
                                </div>
                                <p className="text-2xl font-black text-primary tracking-tight">
                                    {stats.totalTags}
                                </p>
                                <p className="text-[10px] text-text-muted font-medium truncate">
                                    Across all logged activity
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-surface-subtle border border-border-subtle space-y-1">
                                <div className="flex items-center gap-1.5 text-text-muted">
                                    <TrendingUp size={13} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Tagged Spend</span>
                                </div>
                                <p className="text-2xl font-black text-primary tracking-tight truncate">
                                    {formatCurrency(stats.totalSpend)}
                                </p>
                                <p className="text-[10px] text-text-muted font-medium truncate">
                                    {stats.topTag ? `Top: #${stats.topTag.tag}` : 'Total volume'}
                                </p>
                            </div>
                        </div>

                        {/* Search and Sort Toolbar */}
                        <div className="space-y-3">
                            <div className="relative flex items-center">
                                <Search size={16} className="absolute left-3.5 text-text-muted pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter tags by name..."
                                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-surface-subtle border border-border-subtle text-primary placeholder:text-text-muted text-xs font-medium focus:outline-none focus:border-border-focus transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 text-text-muted hover:text-primary transition-colors cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Sort Chips */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted mr-1 shrink-0">
                                    Sort:
                                </span>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setSortBy('count');
                                    }}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                        sortBy === 'count'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'bg-surface-subtle hover:bg-surface-hover text-text-muted border border-border-subtle'
                                    }`}
                                >
                                    Most Used
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setSortBy('amount');
                                    }}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                        sortBy === 'amount'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'bg-surface-subtle hover:bg-surface-hover text-text-muted border border-border-subtle'
                                    }`}
                                >
                                    Highest Spend
                                </button>
                                <button
                                    onClick={() => {
                                        haptics.selection();
                                        setSortBy('name');
                                    }}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                        sortBy === 'name'
                                            ? 'bg-primary text-text-inverse shadow-sm'
                                            : 'bg-surface-subtle hover:bg-surface-hover text-text-muted border border-border-subtle'
                                    }`}
                                >
                                    Name (A-Z)
                                </button>
                            </div>
                        </div>

                        {/* Tag List */}
                        {filteredTags.length === 0 ? (
                            <div className="p-8 text-center bg-surface-subtle border border-border-subtle rounded-2xl space-y-2">
                                <p className="text-xs font-semibold text-primary">No tags matching "{searchQuery}"</p>
                                <p className="text-[11px] text-text-muted">Check spelling or create this tag on a transaction.</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2 text-xs font-bold text-accent-text hover:underline cursor-pointer"
                                >
                                    Clear search
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {filteredTags.map((tag: TagSummary) => {
                                    const lastUsedFormatted = tag.last_used
                                        ? (() => {
                                              try {
                                                  return format(new Date(tag.last_used), 'dd MMM yyyy');
                                              } catch {
                                                  return null;
                                              }
                                          })()
                                        : null;

                                    return (
                                        <div
                                            key={tag.tag}
                                            onClick={() => handleTagClick(tag.tag)}
                                            className="group bg-surface-subtle hover:bg-surface-hover border border-border-subtle rounded-2xl p-3.5 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer gap-3 shadow-xs"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                <div className="w-10 h-10 rounded-2xl bg-surface-pill border border-border-subtle text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                    <Hash size={18} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {/* Case-sensitive font rendering without lowercase/uppercase CSS */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-primary text-sm tracking-tight truncate font-sans">
                                                            #{tag.tag}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-text-muted font-medium">
                                                        <span>
                                                            {tag.count} transaction{tag.count !== 1 ? 's' : ''}
                                                        </span>
                                                        {lastUsedFormatted && (
                                                            <>
                                                                <span className="opacity-40">•</span>
                                                                <span className="truncate">Last: {lastUsedFormatted}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0 text-right">
                                                <div>
                                                    <p className="font-black text-primary text-sm tracking-tight leading-none">
                                                        {formatCurrency(Number(tag.amount))}
                                                    </p>
                                                    <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold mt-1">
                                                        Total
                                                    </p>
                                                </div>
                                                <ChevronRight
                                                    size={16}
                                                    className="text-text-muted/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Tags;
