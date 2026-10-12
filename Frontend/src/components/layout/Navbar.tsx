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

interface NavItem {
    path: string;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    isAction?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { path: '/dashboard', label: 'Matrix', icon: Home },
    { path: '/analytics', label: 'Flow', icon: BarChart3 },
    { path: '/add', label: 'Add', icon: Plus, isAction: true },
    { path: '/wealth', label: 'Wealth', icon: Briefcase },
    { path: '/more', label: 'Explorer', icon: LayoutGrid },
];


export const Navbar: React.FC = () => {
    return (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-50 md:hidden flex justify-center pointer-events-none px-4 pb-[env(safe-area-inset-bottom,0px)]">
            <nav
                aria-label="Mobile Navigation Dock"
                className="pointer-events-auto relative flex items-center justify-between gap-1 p-1.5 w-full max-w-[364px] rounded-full bg-surface/85 backdrop-blur-2xl saturate-[190%] border border-border-subtle/80 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.08)_inset] transition-all"
            >
                {NAV_ITEMS.map((item) => {
                    if (item.isAction) {
                        return (
                            <div key={item.path} className="flex items-center justify-center px-1">
                                <NavLink
                                    to={item.path}
                                    onPointerDown={() => haptics.impact('medium')}
                                    className="block touch-manipulation focus:outline-none"
                                    aria-label="Add new entry"
                                >
                                    <motion.div
                                        whileTap={{ scale: 0.88 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        className="w-11 h-11 rounded-full bg-accent text-accent-contrast flex items-center justify-center shadow-[0_4px_18px_rgba(56,189,248,0.35)] border-2 border-surface active:brightness-95 transition-all"
                                    >
                                        <Plus size={22} strokeWidth={2.75} />
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
                                relative flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-full transition-all duration-150 touch-manipulation select-none
                                ${isActive ? 'text-accent-text font-bold' : 'text-text-muted hover:text-text-primary'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <motion.div
                                            layoutId="dockActiveCapsule"
                                            className="absolute inset-0 bg-accent-subtle/60 dark:bg-accent/15 rounded-full border border-accent/25 -z-10 shadow-[0_2px_10px_rgba(56,189,248,0.12)]"
                                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                        />
                                    )}
                                    <motion.div
                                        whileTap={{ scale: 0.86 }}
                                        animate={{ scale: isActive ? 1.08 : 1 }}
                                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                        className="flex items-center justify-center"
                                    >
                                        <item.icon
                                            size={19}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            className={`transition-colors ${isActive ? 'text-accent-text drop-shadow-[0_0_8px_var(--color-accent-subtle)]' : ''}`}
                                        />
                                    </motion.div>
                                    <span className={`text-[9px] tracking-tight mt-0.5 leading-none transition-all ${isActive ? 'font-black text-accent-text' : 'font-semibold text-text-muted'
                                        }`}>
                                        {item.label}
                                    </span>
                                    {/* macOS Dock Micro-Dot Running Indicator */}
                                    {isActive && (
                                        <motion.span
                                            layoutId="dockActiveDot"
                                            className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent shadow-[0_0_5px_var(--color-accent)]"
                                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </div>
    );
};
