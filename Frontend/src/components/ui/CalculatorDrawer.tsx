import React, { useState } from 'react';
import { Delete, Check } from 'lucide-react';
import { Drawer } from './Drawer';
import { haptics } from '../../lib/haptics';

interface CalculatorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    initialValue?: string;
}

export const CalculatorDrawer: React.FC<CalculatorDrawerProps> = ({ isOpen, onClose, onConfirm, initialValue = '0' }) => {
    const [expression, setExpression] = useState(initialValue);

    // Keyboard support
    React.useEffect(() => {
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
        if (expression === '0' && val !== '.') {
            setExpression(val);
        } else {
            setExpression(prev => prev + val);
        }
    };

    const handleClear = () => {
        haptics.impact('light');
        setExpression('0');
    };

    const handleDelete = () => {
        haptics.selection();
        setExpression(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    };

    const handleCalculate = () => {
        haptics.impact('light');
        try {
            // Safe eval
            // eslint-disable-next-line
            const result = Function('"use strict";return (' + expression + ')')();
            setExpression(String(Math.round(result * 100) / 100)); // Round to 2 decimals
        } catch {
            setExpression('Error');
        }
    };

    const handleDone = () => {
        haptics.notification('success');
        let final = expression;
        try {
            if (/[\+\-\*\/]$/.test(expression)) {
                final = expression.slice(0, -1);
            } else {
                // eslint-disable-next-line
                const result = Function('"use strict";return (' + expression + ')')();
                final = String(Math.round(result * 100) / 100);
            }
        } catch {
            // ignore
        }
        onConfirm(final);
        onClose();
    };

    const btnClass = "rounded-2xl font-bold active:scale-[0.93] transition-transform duration-75 select-none touch-manipulation flex items-center justify-center py-4 border border-border-subtle";

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Calculator" height="h-[80vh]" noPadding>
            <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto">
                    {/* Display with Apple optical sizing */}
                    <div className="bg-sunken border border-border-subtle p-6 rounded-[24px] mb-6 text-right shadow-inner flex-shrink-0">
                        <span className="text-4xl font-mono text-text-primary tracking-wider break-all tabular-nums">{expression}</span>
                    </div>

                    {/* Keypad Grid with tactile feedback */}
                    <div className="grid grid-cols-4 gap-3 flex-1">
                        <button onClick={handleClear} className={`${btnClass} col-span-1 bg-white/[0.08] text-white hover:bg-white/[0.12] text-xl`}>C</button>
                        <button onClick={handleDelete} className={`${btnClass} col-span-1 bg-white/[0.04] hover:bg-white/[0.08] text-white`}><Delete size={20} /></button>
                        <button onClick={() => handlePress('/')} className={`${btnClass} bg-white/[0.08] text-white hover:bg-white/[0.12] text-xl`}>÷</button>
                        <button onClick={() => handlePress('*')} className={`${btnClass} bg-white/[0.08] text-white hover:bg-white/[0.12] text-xl`}>×</button>

                        <button onClick={() => handlePress('7')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>7</button>
                        <button onClick={() => handlePress('8')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>8</button>
                        <button onClick={() => handlePress('9')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>9</button>
                        <button onClick={() => handlePress('-')} className={`${btnClass} bg-white/[0.08] text-white hover:bg-white/[0.12] text-xl`}>−</button>

                        <button onClick={() => handlePress('4')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>4</button>
                        <button onClick={() => handlePress('5')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>5</button>
                        <button onClick={() => handlePress('6')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>6</button>
                        <button onClick={() => handlePress('+')} className={`${btnClass} bg-white/[0.08] text-white hover:bg-white/[0.12] text-xl`}>+</button>

                        <button onClick={() => handlePress('1')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>1</button>
                        <button onClick={() => handlePress('2')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>2</button>
                        <button onClick={() => handlePress('3')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>3</button>
                        <button onClick={handleCalculate} className={`${btnClass} row-span-2 bg-white text-black text-2xl hover:bg-neutral-200 shadow-sm font-black`}>=</button>

                        <button onClick={() => handlePress('0')} className={`${btnClass} col-span-2 bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>0</button>
                        <button onClick={() => handlePress('.')} className={`${btnClass} bg-white/[0.03] text-white hover:bg-white/[0.06] text-2xl`}>.</button>
                    </div>
                </div>

                <div className="p-6 pt-2 border-t border-border-subtle bg-transparent">
                    <button
                        onClick={handleDone}
                        className="w-full py-4 bg-white text-black rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-[0.97] transition-all shadow-xl touch-manipulation select-none"
                    >
                        <Check size={20} strokeWidth={3} />
                        Confirm Amount
                    </button>
                </div>
            </div>
        </Drawer>
    );
};
