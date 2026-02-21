import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    Receipt,
    Target,
    CalendarClock,
    BarChart3,
    Briefcase,
    LayoutGrid,
    LogOut
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export const Sidebar: React.FC = () => {
    const logout = useAuthStore((state) => state.logout);

    const NAV_ITEMS = [
        { path: '/', label: 'Matrix', icon: Home },
        { path: '/transactions', label: 'History', icon: Receipt },
        { path: '/credit-cards', label: 'Vault', icon: Target },
        { path: '/bills', label: 'Scheduled', icon: CalendarClock },
        { path: '/analytics', label: 'Flow', icon: BarChart3 },
        { path: '/wealth', label: 'Wealth', icon: Briefcase },
        { path: '/more', label: 'Explorer', icon: LayoutGrid },
    ];

    return (
        <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 border-r border-white/5 bg-slate-900/30 backdrop-blur-xl">
            <div className="p-8 space-y-2">
                <h1 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600">
                    {import.meta.env.VITE_APP_NAME || 'Grip'}
                </h1>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black opacity-60">
                    {import.meta.env.VITE_APP_TAGLINE || 'Spend smart, stress less.'}
                </p>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 group
              ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/10 to-indigo-500/5 text-cyan-400 border border-cyan-500/20 shadow-lg shadow-cyan-900/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-100 hover:pl-7'
                            }
            `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} className={isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'} />
                                <span className="font-medium tracking-wide">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-white/5 mx-4 mb-4">
                <Button
                    variant="secondary"
                    className="w-full justify-start text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border-transparent hover:border-red-500/20"
                    onClick={logout}
                    icon={<LogOut size={18} />}
                >
                    Sign Out
                </Button>
            </div>
        </aside>
    );
};
