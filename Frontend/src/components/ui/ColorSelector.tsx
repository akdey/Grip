import React from 'react';
import { motion } from 'framer-motion';
import { haptics } from '../../lib/haptics';

// 24 Perceptually-balanced, constant-chroma color swatches
const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185',
    '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#94a3b8', '#64748b'
];

interface ColorSelectorProps {
    selectedColor: string | null;
    onSelect: (color: string) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ selectedColor, onSelect }) => {
    return (
        <div className="grid grid-cols-6 gap-3 p-2 select-none">
            {PRESET_COLORS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                    <motion.button
                        key={color}
                        type="button"
                        whileTap={{ scale: 0.84 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                        onPointerDown={() => haptics.selection()}
                        onClick={() => onSelect(color)}
                        className={`
                            w-10 h-10 rounded-full border-2 transition-all duration-150 touch-manipulation
                            ${isSelected
                                ? 'border-white scale-110 shadow-[0_0_16px_rgba(255,255,255,0.4)] ring-2 ring-white/20'
                                : 'border-transparent hover:border-white/30 hover:scale-105'}
                        `}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    />
                );
            })}
        </div>
    );
};
