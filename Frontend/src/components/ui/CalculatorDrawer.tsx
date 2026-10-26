import React, { useState, useEffect, useMemo } from 'react';
import { Delete, Check } from 'lucide-react';
import { Drawer } from './Drawer';
import { haptics } from '../../lib/haptics';

interface CalculatorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    initialValue?: string;
}

// Safe expression evaluator for basic arithmetic (+, -, *, /)
const evaluateExpression = (expr: string): number | null => {
    try {
        if (!expr || expr.trim() === '') return null;
        // Clean trailing operators for live preview
        let sanitized = expr.trim().replace(/[+\-*/.]+$/, '');
        if (!sanitized) return null;

        // Only allow safe arithmetic characters
        if (!/^[0-9+\-*/.\s()]+$/.test(sanitized)) return null;

        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + sanitized + ')')();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
            return Math.round(result * 100) / 100;
        }
        return null;
    } catch {
        return null;
    }
};

export const CalculatorDrawer: React.FC<CalculatorDrawerProps> = ({
    isOpen,
    onClose,
    onConfirm,
    initialValue = '0'
}) => {
    const [expression, setExpression] = useState('0');

    // Populate initial value whenever the calculator opens
    useEffect(() => {
        if (isOpen) {
            const clean = initialValue && initialValue.trim() !== '' && initialValue.trim() !== '0'
                ? initialValue.trim()
                : '0';
            setExpression(clean);
        }
    }, [isOpen, initialValue]);

    // Live preview calculation as the user types
    const livePreview = useMemo(() => {
        const hasOperator = /[+\-*/]/.test(expression);
        if (!hasOperator) return null;
        const result = evaluateExpression(expression);
        if (result !== null && String(result) !== expression) {
            return String(result);
        }
        return null;
    }, [expression]);

    // Keyboard support
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key;
            if (/^[0-9.]$/.test(key)) handlePress(key);
            if (['+', '-', '*', '/'].includes(key)) handlePress(key);
            if (key === 'Backspace') handleDelete();
            if (key === 'Enter') {
                e.preventDefault();
                handleDone();
            }
            if (key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, expression]);

    const handlePress = (val: string) => {
        haptics.selection();
        setExpression(prev => {
            if (prev === '0' && val !== '.') {
                return val;
            }
            // If pressing an operator after an existing operator, replace it
            if (['+', '-', '*', '/'].includes(val) && /[+\-*/]$/.test(prev)) {
                return prev.slice(0, -1) + val;
            }
            return prev + val;
        });
    };

    const handleClear = () => {
        haptics.impact('light');
        setExpression('0');
    };

    const handleDelete = () => {
        haptics.selection();
        setExpression(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    };

    const handleCalculate = () => {
        haptics.impact('light');
        const result = evaluateExpression(expression);
        if (result !== null) {
            setExpression(String(result));
        } else {
            setExpression('0');
        }
    };

    const handleDone = () => {
        haptics.notification('success');
        let final = expression;
        const evaluated = evaluateExpression(expression);
        if (evaluated !== null) {
            final = String(evaluated);
        } else {
            final = expression.replace(/[+\-*/.]+$/, '') || '0';
        }
        onConfirm(final);
        onClose();
    };

    // Dynamic typography scaling based on length
    const displayFontSize = useMemo(() => {
        const len = expression.length;
        if (len > 14) return 'text-xl sm:text-2xl';
        if (len > 9) return 'text-2xl sm:text-3xl';
        if (len > 6) return 'text-3xl sm:text-4xl';
        return 'text-4xl sm:text-5xl';
    }, [expression]);

    // Theme-compatible button styles using Grip semantic tokens
    const baseBtn = "rounded-2xl font-bold active:scale-[0.93] transition-all duration-75 select-none touch-manipulation flex items-center justify-center cursor-pointer border border-border-subtle h-12 sm:h-14";
    const numBtn = `${baseBtn} bg-surface-subtle hover:bg-surface-hover text-primary text-xl sm:text-2xl shadow-xs`;
    const opBtn = `${baseBtn} bg-surface-pill hover:bg-surface-hover text-accent-text border-border-subtle text-xl sm:text-2xl`;

    return (
        <Drawer
            isOpen={isOpen}
            onClose={onClose}
            title="Calculator"
            height="h-[84vh] max-h-[640px]"
            noPadding
        >
            <div className="flex flex-col h-full justify-between p-4 sm:p-5 overflow-hidden">
                {/* Expandable Display Container */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-subtle border border-border-subtle flex flex-col justify-end text-right transition-all duration-200 mb-3 shadow-xs shrink-0 min-h-[90px]">
                    {/* Top row: Operation expression when live preview is active */}
                    {livePreview !== null ? (
                        <div className="text-xs sm:text-sm text-text-muted font-mono tracking-wider truncate mb-1 animate-fadeIn">
                            {expression.replace(/\*/g, '×').replace(/\//g, '÷')}
                        </div>
                    ) : null}

                    {/* Main input line */}
                    <div className="flex items-baseline justify-end gap-2 overflow-x-auto no-scrollbar">
                        <span className={`font-mono text-primary font-bold tracking-tight break-all tabular-nums transition-all ${displayFontSize}`}>
                            {livePreview !== null ? `= ${livePreview}` : expression.replace(/\*/g, '×').replace(/\//g, '÷')}
                        </span>
                    </div>
                </div>

                {/* Keypad Grid (Fits all 5 rows proportionally without scrolling) */}
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5 flex-1 min-h-0">
                    {/* Row 1 */}
                    <button
                        type="button"
                        onClick={handleClear}
                        className={`${baseBtn} bg-status-danger-bg text-status-danger-text border-status-danger-border hover:opacity-80 text-lg sm:text-xl font-bold`}
                    >
                        C
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className={`${baseBtn} bg-surface-subtle hover:bg-surface-hover text-text-muted hover:text-primary`}
                        title="Backspace"
                    >
                        <Delete size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePress('/')}
                        className={opBtn}
                    >
                        ÷
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePress('*')}
                        className={opBtn}
                    >
                        ×
                    </button>

                    {/* Row 2 */}
                    <button type="button" onClick={() => handlePress('7')} className={numBtn}>7</button>
                    <button type="button" onClick={() => handlePress('8')} className={numBtn}>8</button>
                    <button type="button" onClick={() => handlePress('9')} className={numBtn}>9</button>
                    <button type="button" onClick={() => handlePress('-')} className={opBtn}>−</button>

                    {/* Row 3 */}
                    <button type="button" onClick={() => handlePress('4')} className={numBtn}>4</button>
                    <button type="button" onClick={() => handlePress('5')} className={numBtn}>5</button>
                    <button type="button" onClick={() => handlePress('6')} className={numBtn}>6</button>
                    <button type="button" onClick={() => handlePress('+')} className={opBtn}>+</button>

                    {/* Row 4 */}
                    <button type="button" onClick={() => handlePress('1')} className={numBtn}>1</button>
                    <button type="button" onClick={() => handlePress('2')} className={numBtn}>2</button>
                    <button type="button" onClick={() => handlePress('3')} className={numBtn}>3</button>
                    <button
                        type="button"
                        onClick={handleCalculate}
                        className={`${baseBtn} row-span-2 bg-primary text-text-inverse hover:opacity-90 text-2xl font-black shadow-sm h-full`}
                    >
                        =
                    </button>

                    {/* Row 5 */}
                    <button type="button" onClick={() => handlePress('0')} className={`${numBtn} col-span-2`}>0</button>
                    <button type="button" onClick={() => handlePress('.')} className={numBtn}>.</button>
                </div>

                {/* Bottom Action Bar */}
                <div className="pt-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleDone}
                        className="w-full h-12 rounded-xl bg-primary hover:opacity-90 text-text-inverse text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md touch-manipulation cursor-pointer"
                    >
                        <Check size={18} strokeWidth={2.5} />
                        <span>Apply Amount {livePreview ? `(₹${livePreview})` : expression !== '0' ? `(₹${expression})` : ''}</span>
                    </button>
                </div>
            </div>
        </Drawer>
    );
};
