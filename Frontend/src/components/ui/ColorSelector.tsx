import React from 'react';
import { motion } from 'framer-motion';
import { haptics } from '../../lib/haptics';

// 24 muted tones — hues spaced ≥18° apart, S 28-45%, L 36-47%. No neon, no AI-vibe.
// First 18 = category colors. Last 6 = neutral tones for custom entries.
const PRESET_COLORS = [
    '#7A3A3A', '#8A4A2C', '#5C3C24', '#886030', // reds → warm earth
    '#887228', '#607028',                         // golds → olive
    '#38763C', '#2E6650',                         // greens
    '#2A6272', '#265078', '#2C3E88', '#3C3278',  // teal → cobalt → indigo
    '#52368A', '#5E2872', '#782E68', '#782E46',  // purple → mauve → rose
    '#485465', '#5A6068',                         // neutral slate / grey
    '#6E5A4E', '#4E5A52', '#52485E', '#5E5248',  // warm / cool neutrals
    '#7A6E62', '#48545A',                         // parchment, steel
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
