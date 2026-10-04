import React, { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, CreditCard as CardIcon, ArrowUpRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { haptics } from '../../../lib/haptics';
import type { SafeToSpend, CardExposureItem } from '../hooks';

interface CardExposureDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    safeToSpend: SafeToSpend | undefined;
    formatCurrency: (amount: number) => string;
}

export const CardExposureDrawer: React.FC<CardExposureDrawerProps> = memo(({
    isOpen,
    onClose,
    safeToSpend,
    formatCurrency
}) => {
    const navigate = useNavigate();
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    const exposureItems = safeToSpend?.frozen_funds?.card_exposure || [];
    const cardBreakdown = safeToSpend?.frozen_funds?.card_breakdown || [];
    const totalExposure = Number(safeToSpend?.frozen_funds?.unbilled_cc || 0);

    const filteredItems = selectedCardId
        ? exposureItems.filter(item => (item.card_id || 'unassigned') === selectedCardId)
        : exposureItems;

    const parseDateSafe = (dateStr: string) => {
        try {
            return parseISO(dateStr);
        } catch {
            return new Date(dateStr);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[2000] flex justify-center pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            haptics.selection();
                            onClose();
                        }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 340, mass: 0.85 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0.14, bottom: 0.8 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 140 || info.velocity.y > 550) {
                                haptics.impact('light');
                                onClose();
                            } else {
                                haptics.selection();
                            }
                        }}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[90vh] glass-drawer rounded-t-[3rem] flex flex-col shadow-[0_-20px_100px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto z-[2000] select-none touch-none"
                    >
                        {/* Grabber Pill */}
                        <div
                            className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
                            onClick={() => {
                                haptics.selection();
                                onClose();
                            }}
                        >
                            <div className="w-10 h-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors active:scale-95" />
                        </div>

                        {/* Header */}
                        <div className="p-6 sm:p-8 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02] shrink-0">
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic heading-apple">Card Exposure Ledger</h2>
                                    <span className="text-[9px] font-bold text-metric-exposure-text uppercase tracking-widest bg-metric-exposure-bg px-2.5 py-1 rounded-full border border-metric-exposure-border">
                                        Active CC Swipes
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[4px] mt-1">Unsettled credit card charges & debt</p>
                            </div>
                            <button
                                onClick={() => {
                                    haptics.selection();
                                    onClose();
                                }}
                                className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all shadow-xl group touch-manipulation"
                                aria-label="Close card exposure ledger"
                            >
                                <ChevronDown size={24} className="group-hover:translate-y-0.5 transition-transform" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 custom-scrollbar select-text">
                            {/* Card Breakdown Pills/Cards */}
                            {cardBreakdown.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[3px]">Cards in Exposure</span>
                                        {selectedCardId && (
                                            <button
                                                onClick={() => setSelectedCardId(null)}
                                                className="text-[9px] font-bold text-white/70 uppercase tracking-wider hover:text-white transition-colors"
                                            >
                                                Show All Cards
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {cardBreakdown.map((card) => {
                                            const isSelected = selectedCardId === (card.card_id || 'unassigned');
                                            return (
                                                <div
                                                    key={card.card_id || 'unassigned'}
                                                    onClick={() => setSelectedCardId(isSelected ? null : (card.card_id || 'unassigned'))}
                                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] ${
                                                        isSelected
                                                            ? 'bg-accent-subtle border-accent-border'
                                                            : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-accent text-black font-bold' : 'bg-metric-exposure-bg text-metric-exposure-text border border-metric-exposure-border'}`}>
                                                            <CardIcon size={16} />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-white uppercase tracking-tight line-clamp-1">{card.card_name}</p>
                                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                                                                {card.last_four_digits ? `•••• ${card.last_four_digits}` : 'Unassigned'} • {card.count} {card.count === 1 ? 'swipe' : 'swipes'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-white tracking-tighter">
                                                            {formatCurrency(card.amount)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Section Header for Items */}
                            <div className="flex items-center justify-between px-1 pt-2">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[3px]">
                                    {selectedCardId ? 'Filtered Swipes' : 'All Unsettled Swipes'} ({filteredItems.length})
                                </span>
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate('/credit-cards');
                                    }}
                                    className="text-[9px] text-accent-text hover:text-accent-hover font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                                >
                                    <span>Manage in Vault</span>
                                    <ArrowUpRight size={12} />
                                </button>
                            </div>

                            {/* Swipes List */}
                            <div className="space-y-3">
                                {filteredItems.length > 0 ? (
                                    filteredItems.map((item: CardExposureItem) => (
                                        <div
                                            key={item.id}
                                            onClick={() => {
                                                onClose();
                                                if (item.card_id) {
                                                    navigate(`/credit-cards/${item.card_id}`);
                                                } else {
                                                    navigate('/credit-cards');
                                                }
                                            }}
                                            className="p-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between group hover:bg-white/[0.04] transition-all cursor-pointer active:scale-[0.99]"
                                            title="View card in Vault to settle this swipe"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-9 h-9 rounded-2xl bg-metric-exposure-bg text-metric-exposure-text flex items-center justify-center shrink-0 border border-metric-exposure-border">
                                                    <CardIcon size={16} />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                                                        {item.merchant_name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-metric-exposure-bg text-metric-exposure-text border border-metric-exposure-border">
                                                            {item.card_name}
                                                            {item.last_four_digits ? ` •••• ${item.last_four_digits}` : ''}
                                                        </span>
                                                        <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider">
                                                            {format(parseDateSafe(item.transaction_date), 'MMM dd')}
                                                        </span>
                                                        <span className="text-[8px] text-text-muted font-bold uppercase tracking-wider">
                                                            • {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-text-primary tracking-tighter">
                                                        {formatCurrency(item.amount)}
                                                    </p>
                                                    <p className="text-[7px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                                        {item.sub_category || item.category || 'General'}
                                                    </p>
                                                </div>
                                                <div className="w-7 h-7 rounded-xl bg-surface-subtle border border-border-subtle flex items-center justify-center text-text-muted group-hover:text-text-primary group-hover:border-border-default transition-all">
                                                    <ArrowUpRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <CardIcon size={36} className="mx-auto text-text-disabled mb-4 opacity-20" />
                                        <p className="text-text-muted font-black uppercase tracking-[4px] text-xs">No card exposure identified</p>
                                        <p className="text-text-disabled text-[10px] font-medium mt-1">All credit card swipes are fully settled</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Total */}
                        <div className="p-8 sm:p-12 bg-surface-subtle border-t border-border-subtle shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[4px]">Total Card Exposure</span>
                                    <span className="text-[9px] text-text-disabled font-bold uppercase tracking-widest">
                                        Sum of all unsettled swipes
                                    </span>
                                </div>
                                <span className="text-2xl font-black text-text-primary tracking-tighter">
                                    {formatCurrency(totalExposure)}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
});
