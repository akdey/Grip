import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Sparkles,
    Send,
    Bot,
    User as UserIcon,
    Terminal,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    Zap,
    RotateCcw,
    Receipt,
    Calendar,
    Tag,
    Clock,
    AlertCircle
} from 'lucide-react';

import { useAssistantQuery } from '../features/assistant/hooks';
import type { ChatMessage, AssistantQueryResultItem } from '../features/assistant/types';
import { Card } from '../components/ui/Card';
import { haptics } from '../lib/haptics';

const SUGGESTIONS = [
    { label: '🔥 Last cooking gas / LPG', query: 'When did I last buy cooking gas?' },
    { label: '⛽ Last vehicle fuel / petrol', query: 'When did I last buy petrol?' },
    { label: '🍔 Food spend this month', query: 'How much did I spend on food this month?' },
    { label: '📈 Highest expense', query: 'What was my highest expense this month?' },
    { label: '🛒 Recent Swiggy orders', query: 'Show my latest Swiggy orders' },
    { label: '💡 Utility & bills spend', query: 'How much did I spend on bills and utilities?' }
];

function formatTime(ms: number): string {
    if (!ms || ms <= 0) return '0ms';
    const seconds = Math.floor(ms / 1000);
    const remainingMs = Math.round(ms % 1000);
    if (seconds > 0) {
        return `${seconds}s ${remainingMs}ms`;
    }
    return `${remainingMs}ms`;
}

export const Assistant: React.FC = () => {
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<'llm' | 'preset'>('llm');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [expandedSqlIds, setExpandedSqlIds] = useState<Record<string, boolean>>({});
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { mutate: queryAssistant, isPending } = useAssistantQuery();

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isPending]);

    const handleSend = (textToSend?: string) => {
        const question = (textToSend || input).trim();
        if (!question || isPending) return;

        haptics.impact('light');
        setInput('');

        const userMsgId = `user-${Date.now()}`;
        const newMessages: ChatMessage[] = [
            ...messages,
            {
                id: userMsgId,
                role: 'user',
                content: question,
                timestamp: new Date()
            }
        ];
        setMessages(newMessages);

        queryAssistant(
            { question, mode },
            {
                onSuccess: (data) => {
                    haptics.notification('success');
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `asst-${Date.now()}`,
                            role: 'assistant',
                            content: data.answer,
                            response: data,
                            timestamp: new Date()
                        }
                    ]);
                },
                onError: (err: any) => {
                    haptics.notification('error');
                    const errorDetail = err?.response?.data?.detail || err?.message || 'Failed to process question';
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `err-${Date.now()}`,
                            role: 'assistant',
                            content: errorDetail,
                            error: errorDetail,
                            timestamp: new Date()
                        }
                    ]);
                }
            }
        );
    };

    const toggleSql = (msgId: string) => {
        haptics.selection();
        setExpandedSqlIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-text-primary">
            {/* Header */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4 bg-surface/80 backdrop-blur-xl border-b border-border-subtle">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            haptics.impact('light');
                            navigate(-1);
                        }}
                        className="p-2 -ml-2 rounded-full hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-black tracking-tight text-text-primary flex items-center gap-1.5">
                                <Sparkles size={18} className="text-accent" />
                                Ask Grip
                            </h1>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-accent-subtle text-accent-text border border-accent-border">
                                Experimental
                            </span>
                        </div>
                        <p className="text-[10px] text-text-muted font-medium">
                            {mode === 'llm' ? '🤖 Gemma 4 AI Text-to-SQL' : '⚡ Local Preset Mode'} · Read-Only Sandbox
                        </p>
                    </div>
                </div>

                {messages.length > 0 && (
                    <button
                        onClick={() => {
                            haptics.selection();
                            setMessages([]);
                        }}
                        className="p-2 rounded-full hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1"
                        title="Clear conversation"
                    >
                        <RotateCcw size={14} />
                    </button>
                )}
            </header>

            {/* Chat Body */}
            <main className="flex-1 px-4 sm:px-6 py-4 max-w-3xl mx-auto w-full space-y-4 pb-36">
                {/* Hero / Empty State */}
                {messages.length === 0 && (
                    <div className="py-4 text-center space-y-4 animate-enter">
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-pill border border-border-subtle flex items-center justify-center shadow-sm">
                            <Bot size={24} className="text-accent" />
                        </div>

                        <div className="space-y-1 max-w-md mx-auto">
                            <h2 className="text-lg font-black text-text-primary tracking-tight">
                                Natural Financial Intelligence
                            </h2>
                            <p className="text-[11px] text-text-muted leading-relaxed">
                                Ask any question about your spending, merchants, or notes.
                                Choose between deep AI translation or instant local presets.
                            </p>
                        </div>

                        {/* Suggestions Grid (2-column compact for mobile) */}
                        <div className="space-y-1.5 pt-1">
                            <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                                Try asking:
                            </p>
                            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-left">
                                {SUGGESTIONS.map((s, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(s.query)}
                                        className="text-[11px] font-medium p-2.5 rounded-xl bg-surface border border-border-subtle hover:border-accent-border hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-all active:scale-95 leading-snug truncate"
                                        title={s.label}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Safety Note */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle border border-border-subtle text-[9px] text-text-muted">
                            <ShieldCheck size={11} className="text-status-success-text shrink-0" />
                            <span>Strictly read-only: INSERT, UPDATE, and DELETE are cryptographically isolated.</span>
                        </div>
                    </div>
                )}

                {/* Messages List */}
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-enter`}
                        >
                            {/* User Message */}
                            {msg.role === 'user' ? (
                                <div className="max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl bg-text-primary text-text-inverse text-xs sm:text-sm font-medium shadow-sm">
                                    {msg.content}
                                </div>
                            ) : (
                                /* Assistant Message */
                                <div className="max-w-[95%] sm:max-w-[85%] space-y-3">
                                    <div className="p-4 rounded-3xl bg-surface border border-border-subtle shadow-xs space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                                msg.response?.engine_used === 'PRESET_FAST_PATH'
                                                    ? 'bg-amber-500/10 border border-amber-500/20'
                                                    : 'bg-accent-subtle border border-accent-border'
                                            }`}>
                                                {msg.response?.engine_used === 'PRESET_FAST_PATH' ? (
                                                    <Zap size={11} className="text-amber-400" />
                                                ) : (
                                                    <Sparkles size={11} className="text-accent-text" />
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                                {msg.response?.engine_used === 'PRESET_FAST_PATH' ? 'Local Preset' : 'Gemma 4 AI'}
                                            </span>
                                            {msg.response?.engine_used === 'PRESET_FAST_PATH' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    Instant Match
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent-subtle text-accent-text border border-accent-border">
                                                    Text-to-SQL
                                                </span>
                                            )}
                                            {msg.response && (
                                                <span className="text-[10px] font-mono text-text-muted ml-auto flex items-center gap-1">
                                                    <Clock size={10} className="text-text-muted" />
                                                    {formatTime(msg.response.execution_time_ms)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Answer Text */}
                                        <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium">
                                            {msg.content}
                                        </p>

                                        {/* Error Notice */}
                                        {msg.error && (
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-status-danger-subtle text-status-danger-text text-xs border border-status-danger-border">
                                                <AlertCircle size={14} className="shrink-0" />
                                                <span>{msg.error}</span>
                                            </div>
                                        )}

                                        {/* Rendered Transaction Cards */}
                                        {msg.response && msg.response.results && msg.response.results.length > 0 && (
                                            <div className="space-y-2 pt-1 border-t border-border-subtle">
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                                    {msg.response.results.length === 1 ? 'Matched Record:' : `Results (${msg.response.results.length}):`}
                                                </p>
                                                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                                    {msg.response.results.map((row, rIdx) => (
                                                        <TransactionCard key={rIdx} row={row} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Executed SQL Inspector */}
                                        {msg.response?.sql_query && (
                                            <div className="pt-1 border-t border-border-subtle">
                                                <button
                                                    onClick={() => toggleSql(msg.id)}
                                                    className="w-full flex items-center justify-between text-[10px] font-mono text-text-muted hover:text-text-primary py-1 transition-colors"
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Terminal size={12} className="text-accent" />
                                                        View Generated SQL Query
                                                    </span>
                                                    {expandedSqlIds[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>

                                                <AnimatePresence>
                                                    {expandedSqlIds[msg.id] && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="mt-2 p-3 rounded-xl bg-black/40 border border-border-subtle font-mono text-[11px] text-text-secondary leading-relaxed overflow-x-auto">
                                                                <code className="text-accent-text">{msg.response.sql_query}</code>
                                                                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-text-muted">
                                                                    <span>
                                                                        {msg.response.engine_used === 'PRESET_FAST_PATH' ? '⚡ Source: Preset Query Match' : '🤖 Source: Gemma 4 Generated SQL'}
                                                                    </span>
                                                                    <span>{msg.response.row_count} row(s) returned</span>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Pending Inference Indicator */}
                    {isPending && (
                        <div className="flex flex-col items-start animate-pulse">
                            <div className="p-4 rounded-3xl bg-surface border border-border-subtle max-w-[85%] space-y-2">
                                <div className="flex items-center gap-2">
                                    <Sparkles size={14} className="text-accent animate-spin" />
                                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                        {mode === 'llm' ? 'Gemma 4 Formulating Query...' : 'Matching Local Preset...'}
                                    </span>
                                </div>
                                <p className="text-xs text-text-secondary">
                                    {mode === 'llm'
                                        ? 'Translating natural language to SQL and querying transactions...'
                                        : 'Evaluating deterministic local SQL patterns...'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div ref={chatEndRef} />
                </div>
            </main>

            {/* Input Footer with Mode Switcher */}
            <footer className="fixed bottom-0 inset-x-0 bg-surface/90 backdrop-blur-2xl border-t border-border-subtle p-3 sm:p-4 z-40 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
                <div className="max-w-3xl mx-auto space-y-2">
                    {/* Transparent Mode Toggle */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-surface-subtle border border-border-subtle">
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setMode('llm');
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    mode === 'llm'
                                        ? 'bg-accent text-accent-inverse shadow-xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                <Sparkles size={11} />
                                <span>Gemma 4 AI</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    haptics.selection();
                                    setMode('preset');
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    mode === 'preset'
                                        ? 'bg-amber-500 text-black shadow-xs'
                                        : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                                <Zap size={11} />
                                <span>Fast Preset</span>
                            </button>
                        </div>
                        <span className="text-[9px] text-text-muted font-medium">
                            {mode === 'llm' ? 'Open-ended reasoning' : 'Instant 0.1ms matching'}
                        </span>
                    </div>

                    {/* Input Field Form */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={
                                mode === 'llm'
                                    ? "Ask Gemma 4 anything... e.g. 'When did I last buy cooking gas?'"
                                    : "Ask preset pattern... e.g. 'When did I last buy cooking gas?'"
                            }
                            disabled={isPending}
                            className="flex-1 bg-surface-subtle border border-border-subtle rounded-2xl px-4 py-3 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-border transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isPending}
                            className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                                input.trim() && !isPending
                                    ? 'bg-text-primary text-text-inverse hover:brightness-110 active:scale-95 shadow-sm'
                                    : 'bg-surface-subtle text-text-muted cursor-not-allowed opacity-50'
                            }`}
                            aria-label="Send"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </footer>
        </div>
    );
};

/** Compact Card for Single or Multiple Transaction Results */
const TransactionCard: React.FC<{ row: AssistantQueryResultItem }> = ({ row }) => {
    const amount = typeof row.amount === 'number' ? row.amount : null;
    const isDebit = amount !== null && amount < 0;

    return (
        <div className="p-3 rounded-2xl bg-surface-subtle border border-border-subtle flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">
                    {row.merchant_name || 'Transaction'}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted">
                    {row.transaction_date && (
                        <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {row.transaction_date}
                        </span>
                    )}
                    {row.category && (
                        <span className="px-1.5 py-0.5 rounded-full bg-surface-pill border border-border-subtle text-text-secondary font-medium">
                            {row.category}
                        </span>
                    )}
                    {row.sub_category && (
                        <span className="px-1.5 py-0.5 rounded-full bg-surface-pill border border-border-subtle text-text-muted font-medium">
                            {row.sub_category}
                        </span>
                    )}
                </div>
                {row.remarks && row.remarks.trim() && (
                    <p className="text-[10px] text-text-muted italic truncate">
                        "{row.remarks}"
                    </p>
                )}
            </div>

            {amount !== null && (
                <div className="text-right shrink-0">
                    <p className={`text-xs font-extrabold tabular-nums ${isDebit ? 'text-text-primary' : 'text-status-success-text'}`}>
                        {isDebit ? '-' : '+'}₹{Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    {row.account_type && (
                        <p className="text-[9px] font-mono text-text-muted uppercase">
                            {row.account_type}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Assistant;
