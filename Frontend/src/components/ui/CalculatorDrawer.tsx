import React, { useState } from 'react';
import { Delete, Check } from 'lucide-react';
import { Drawer } from './Drawer';

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
        if (expression === '0' && val !== '.') {
            setExpression(val);
        } else {
            setExpression(prev => prev + val);
        }
    };

    const handleClear = () => setExpression('0');
    const handleDelete = () => setExpression(prev => prev.length > 1 ? prev.slice(0, -1) : '0');

    const handleCalculate = () => {
        try {
            // Safe eval
            // eslint-disable-next-line
            const result = Function('"use strict";return (' + expression + ')')();
            setExpression(String(Math.round(result * 100) / 100)); // Round to 2 decimals
        } catch (e) {
            setExpression('Error');
        }
    };

    const handleDone = () => {
        let final = expression;
        try {
            // check if expression is incomplete (e.g. "5+")
            if (/[\+\-\*\/]$/.test(expression)) {
                final = expression.slice(0, -1);
            } else {
                // eslint-disable-next-line
                const result = Function('"use strict";return (' + expression + ')')();
                final = String(Math.round(result * 100) / 100);
            }
        } catch (e) {
            // ignore
        }
        onConfirm(final);
        onClose();
    };

    return (
        <Drawer isOpen={isOpen} onClose={onClose} title="Calculator" height="h-[75vh]">
            <div className="flex flex-col h-full pb-6 px-2">
                {/* Display */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-[24px] mb-6 text-right shadow-inner">
                    <span className="text-4xl font-mono text-white tracking-widest break-all">{expression}</span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-4 gap-3 flex-1 min-h-0">
                    <button onClick={handleClear} className="col-span-1 bg-red-500/10 text-red-400 rounded-2xl font-bold text-xl hover:bg-red-500/20 transition-colors">C</button>
                    <button onClick={handleDelete} className="col-span-1 bg-gray-700/50 text-white rounded-2xl flex items-center justify-center hover:bg-gray-700 transition-colors"><Delete size={20} /></button>
                    <button onClick={() => handlePress('/')} className="bg-indigo-500/10 text-indigo-400 rounded-2xl font-bold text-xl hover:bg-indigo-500/20 transition-colors">÷</button>
                    <button onClick={() => handlePress('*')} className="bg-indigo-500/10 text-indigo-400 rounded-2xl font-bold text-xl hover:bg-indigo-500/20 transition-colors">×</button>

                    <button onClick={() => handlePress('7')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">7</button>
                    <button onClick={() => handlePress('8')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">8</button>
                    <button onClick={() => handlePress('9')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">9</button>
                    <button onClick={() => handlePress('-')} className="bg-indigo-500/10 text-indigo-400 rounded-2xl font-bold text-xl hover:bg-indigo-500/20 transition-colors">-</button>

                    <button onClick={() => handlePress('4')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">4</button>
                    <button onClick={() => handlePress('5')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">5</button>
                    <button onClick={() => handlePress('6')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">6</button>
                    <button onClick={() => handlePress('+')} className="bg-indigo-500/10 text-indigo-400 rounded-2xl font-bold text-xl hover:bg-indigo-500/20 transition-colors">+</button>

                    <button onClick={() => handlePress('1')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">1</button>
                    <button onClick={() => handlePress('2')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">2</button>
                    <button onClick={() => handlePress('3')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">3</button>
                    <button onClick={() => handleCalculate()} className="row-span-2 bg-emerald-500 text-black rounded-2xl font-bold text-2xl hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-colors">=</button>

                    <button onClick={() => handlePress('0')} className="col-span-2 bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">0</button>
                    <button onClick={() => handlePress('.')} className="bg-white/5 text-white rounded-2xl font-bold text-2xl hover:bg-white/10 transition-colors">.</button>
                </div>

                <button onClick={handleDone} className="mt-6 w-full py-4 bg-white/10 rounded-2xl text-lg font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors text-white active:scale-95">
                    <Check size={20} />
                    Use this amount
                </button>
            </div>
        </Drawer>
    );
};
