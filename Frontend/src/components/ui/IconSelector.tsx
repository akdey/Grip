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
                                            ? 'bg-primary text-text-inverse border-primary shadow-[0_8px_25px_rgba(0,0,0,0.25)] scale-105 z-10'
                                            : 'bg-surface-subtle border-border-subtle hover:bg-surface-hover text-text-primary hover:scale-102'}
                                    `}
                                    aria-label={`Select icon ${iconName}`}
                                >
                                    <CategoryIcon
                                        name={iconName}
                                        size={22}
                                        color={isSelected ? 'var(--color-text-inverse)' : undefined}
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
