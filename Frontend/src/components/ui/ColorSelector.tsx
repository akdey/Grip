import React from 'react';
import { motion } from 'framer-motion';

const PRESET_COLORS = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
    '#ff5722', '#795548', '#9e9e9e', '#607d8b', '#000000',
    '#ffffff', '#ff80ab', '#b9f6ca', '#ffff8d', '#ff9e80'
];

interface ColorSelectorProps {
    selectedColor: string | null;
    onSelect: (color: string) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ selectedColor, onSelect }) => {
    return (
        <div className="grid grid-cols-6 gap-3 p-2">
            {PRESET_COLORS.map((color) => (
                <motion.button
                    key={color}
                    whileTap={{ scale: 0.8 }}
                    onClick={() => onSelect(color)}
                    className={`
                        w-10 h-10 rounded-full border-2 transition-all
                        ${selectedColor === color
                            ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'border-transparent hover:border-white/20'}
                    `}
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
};
