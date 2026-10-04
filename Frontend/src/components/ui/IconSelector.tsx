import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIZED_LUCIDE_ICONS, CategoryIcon } from './CategoryIcon';
import { haptics } from '../../lib/haptics';

interface IconSelectorProps {
    selectedIcon: string | null;
    onSelect: (icon: string) => void;
    color?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelect, color }) => {
    return (
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar select-none">
            {CATEGORIZED_LUCIDE_ICONS.map((category) => (
                <div key={category.name} className="space-y-2">
                    <h4 className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.1em] ml-1">
                        {category.name}
                    </h4>
                    <div className="grid grid-cols-6 gap-2">
                        {category.icons.map((iconName) => {
                            const isSelected = selectedIcon === iconName;
                            return (
                                <motion.button
                                    key={iconName}
                                    type="button"
                                    whileTap={{ scale: 0.88 }}
                                    transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                                    onPointerDown={() => haptics.selection()}
                                    onClick={() => onSelect(iconName)}
                                    className={`
                                        w-12 h-12 flex items-center justify-center rounded-2xl
                                        transition-all duration-150 border touch-manipulation
                                        ${isSelected
                                            ? 'bg-white text-black border-white shadow-[0_8px_25px_rgba(255,255,255,0.25)] scale-105 z-10'
                                            : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] text-white/90 hover:scale-102'}
                                    `}
                                    aria-label={`Select icon ${iconName}`}
                                >
                                    <CategoryIcon
                                        name={iconName}
                                        size={22}
                                        color={isSelected ? '#000' : (isSelected ? color : undefined)}
                                    />
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
