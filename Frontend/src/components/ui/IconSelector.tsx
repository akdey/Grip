import React from 'react';
import { motion } from 'framer-motion';
import { CATEGORIZED_LUCIDE_ICONS, CategoryIcon } from './CategoryIcon';

interface IconSelectorProps {
    selectedIcon: string | null;
    onSelect: (icon: string) => void;
    color?: string;
}

export const IconSelector: React.FC<IconSelectorProps> = ({ selectedIcon, onSelect, color }) => {
    return (
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {CATEGORIZED_LUCIDE_ICONS.map((category) => (
                <div key={category.name} className="space-y-2">
                    <h4 className="text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">{category.name}</h4>
                    <div className="grid grid-cols-6 gap-2">
                        {category.icons.map((iconName) => (
                            <motion.button
                                key={iconName}
                                type="button"
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onSelect(iconName)}
                                className={`
                                    w-12 h-12 flex items-center justify-center rounded-xl
                                    transition-all border
                                    ${selectedIcon === iconName
                                        ? 'bg-white text-black border-white shadow-[0_10px_20px_rgba(255,255,255,0.2)] z-10'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'}
                                `}
                            >
                                <CategoryIcon
                                    name={iconName}
                                    size={24}
                                    color={selectedIcon === iconName ? '#000' : (selectedIcon === iconName ? color : undefined)}
                                />
                            </motion.button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
