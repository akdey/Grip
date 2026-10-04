import React from 'react';
import { motion } from 'framer-motion';
import { haptics } from '../../lib/haptics';

// 24 Muted luxury financial tones (low saturation, executive mineral and earth palette)
const PRESET_COLORS = [
    '#A85D5A', '#A66B50', '#B37D4D', '#B89D72', '#A38B52', '#7E9168',
    '#5E8C7D', '#4E8A6D', '#4D8E5F', '#568B87', '#4F7B91', '#627D98',
    '#687C99', '#6A7B8E', '#816F96', '#8E7B9D', '#9C8496', '#9A6F7D',
    '#A96F6F', '#94714E', '#82786D', '#858F9E', '#6C7A89', '#546270'
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
