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
import { haptics } from '../../lib/haptics';

export const Sidebar: React.FC = () => {
    const logout = useAuthStore((state) => state.logout);

    const NAV_ITEMS = [
        { path: '/dashboard', label: 'Matrix', icon: Home },
        { path: '/transactions', label: 'History', icon: Receipt },
        { path: '/credit-cards', label: 'Vault', icon: Target },
        { path: '/bills', label: 'Scheduled', icon: CalendarClock },
        { path: '/analytics', label: 'Flow', icon: BarChart3 },
        { path: '/wealth', label: 'Wealth', icon: Briefcase },
        { path: '/more', label: 'Explorer', icon: LayoutGrid },
    ];

    return (
        <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 border-r border-border-subtle bg-surface/85 backdrop-blur-2xl z-40">
            <div className="p-8 space-y-2">
                <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-600 heading-apple">
                    {import.meta.env.VITE_APP_NAME || 'GRIP'}
                </h1>
                <p className="text-[10px] text-text-muted uppercase tracking-widest font-black opacity-60">
                    {import.meta.env.VITE_APP_TAGLINE}
                </p>
            </div>

            <nav className="flex-1 px-4 space-y-1.5 mt-2">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onPointerDown={() => haptics.selection()}
                        className={({ isActive }) => `
                            flex items-center space-x-4 px-5 py-3.5 rounded-2xl transition-all duration-150 group active:scale-[0.98] touch-manipulation select-none
                            ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 text-accent-text border border-accent-border shadow-lg shadow-cyan-950/40'
                                : 'text-text-muted hover:bg-surface-hover hover:text-text-primary border border-transparent'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    size={19}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={isActive ? 'text-accent-text' : 'text-text-disabled group-hover:text-text-secondary'}
                                />
                                <span className={`text-[13px] tracking-wide ${isActive ? 'font-semibold text-text-primary' : 'font-medium'}`}>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-border-subtle mx-4 mb-4">
                <Button
                    variant="secondary"
                    className="w-full justify-start text-status-danger-text hover:text-status-danger-solid-hover hover:bg-status-danger-bg border-transparent hover:border-status-danger-border"
                    onClick={() => {
                        haptics.notification('warning');
                        logout();
                    }}
                    icon={<LogOut size={18} />}
                >
                    Sign Out
                </Button>
            </div>
        </aside>
    );
};
