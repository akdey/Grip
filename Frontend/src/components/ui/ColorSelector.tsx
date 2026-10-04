import React from 'react';
import { motion } from 'framer-motion';
import { haptics } from '../../lib/haptics';

// Surfacing palette for dark glass — L=55-65%, S=48-62%.
// Grounded hues (not neon), bright enough to pop on dark backgrounds.
const PRESET_COLORS = [
    '#C45252', '#C87048', '#A86E42', '#CC8840', // reds → warm earths
    '#B89830', '#8EA840',                         // gold → olive
    '#48A85E', '#3CA87C',                         // sage green → sage teal
    '#3498B8', '#3878C0', '#4A60C0', '#6058C0',  // steel → ocean → cobalt → periwinkle
    '#7A4EC0', '#8838A8', '#A83898', '#C0466A',  // purple → violet → mauve → rose
    '#607890', '#727880',                         // slate / grey
    '#A08060', '#608060', '#706090', '#906070',  // warm / cool muted extras
    '#907040', '#506878',                         // amber, steel
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
