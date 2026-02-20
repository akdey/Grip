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
const NAV_ITEMS = [
    { path: '/', label: 'Matrix', icon: Home },
    { path: '/analytics', label: 'Flow', icon: BarChart3 },
    { path: '/add', label: '', icon: Plus, isAction: true },
    { path: '/wealth', label: 'Wealth', icon: Briefcase },
    { path: '/more', label: 'Explorer', icon: LayoutGrid },
];

export const Navbar: React.FC = () => {

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#050505]/95 glass-blur border-t border-white/[0.05] pb-safe pt-2 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between h-14 relative">
                {NAV_ITEMS.map((item) => {
                    if (item.isAction) {
                        return (
                            <div key={item.path} className="relative -top-6 flex justify-center w-1/5">
                                <NavLink to={item.path} className="block active:scale-90 transition-transform" aria-label="Add new entry">
                                    <motion.div
                                        layoutId="fab-action"
                                        className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-[0_15px_40px_rgba(255,255,255,0.2)] border-4 border-[#050505]"
                                    >
                                        <Plus size={28} strokeWidth={3} />
                                    </motion.div>
                                </NavLink>
                            </div>
                        )
                    }

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex flex-col items-center justify-center w-1/5 space-y-1.5 transition-all
                                ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-400'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]' : ''}
                                    />
                                    <span className="text-[8px] font-black uppercase tracking-[1px]">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};
