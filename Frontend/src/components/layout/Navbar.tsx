import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    BarChart3,
    Plus,
    LayoutGrid,
    Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '../../lib/haptics';

const NAV_ITEMS = [
    { path: '/dashboard', label: 'Matrix', icon: Home },
    { path: '/analytics', label: 'Flow', icon: BarChart3 },
    { path: '/add', label: '', icon: Plus, isAction: true },
    { path: '/wealth', label: 'Wealth', icon: Briefcase },
    { path: '/more', label: 'Explorer', icon: LayoutGrid },
];

export const Navbar: React.FC = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-page/80 backdrop-blur-2xl saturate-[190%] border-t border-border-default pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between h-14 relative">
                {NAV_ITEMS.map((item) => {
                    if (item.isAction) {
                        return (
                            <div key={item.path} className="relative -top-6 flex justify-center w-1/5">
                                <NavLink
                                    to={item.path}
                                    onPointerDown={() => haptics.impact('light')}
                                    className="block active:scale-90 transition-transform duration-100 ease-out touch-manipulation"
                                    aria-label="Add new entry"
                                >
                                    <motion.div
                                        layoutId="fab-action"
                                        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_15px_40px_rgba(255,255,255,0.25)] border-4 border-page"
                                    >
                                        <Plus size={28} strokeWidth={3} />
                                    </motion.div>
                                </NavLink>
                            </div>
                        );
                    }

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onPointerDown={() => haptics.selection()}
                            className={({ isActive }) => `
                                flex flex-col items-center justify-center w-1/5 space-y-1.5 transition-all duration-150 touch-manipulation select-none active:scale-95
                                ${isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <motion.div
                                        animate={{ scale: isActive ? 1.08 : 1 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 350 }}
                                    >
                                        <item.icon
                                            size={20}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            className={isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]' : ''}
                                        />
                                    </motion.div>
                                    <span className="text-[8px] font-black uppercase tracking-[1.2px]">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};
