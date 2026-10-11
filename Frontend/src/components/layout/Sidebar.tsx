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
    LogOut,
    Sun,
    Moon
} from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { Button } from '../ui/Button';
import { haptics } from '../../lib/haptics';
import { useTheme } from '../../lib/theme';

export const Sidebar: React.FC = () => {
    const logout = useAuthStore((state) => state.logout);
    const { isDark, toggleTheme } = useTheme();

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
                <h1 className="text-3xl font-black tracking-tight text-primary heading-apple">
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
                                ? 'bg-accent-subtle text-accent-text border border-accent-border shadow-sm font-semibold'
                                : 'text-text-muted hover:bg-black/[0.04] hover:text-text-primary border border-transparent'
                            }
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon
                                    size={19}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    className={isActive ? 'text-accent-text' : 'text-text-muted group-hover:text-text-primary'}
                                />
                                <span className={`text-[13px] tracking-wide ${isActive ? 'font-semibold text-accent-text' : 'font-medium'}`}>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-border-subtle mx-4 mb-4 space-y-2">
                {/* Theme toggle */}
                <button
                    onClick={() => { haptics.selection(); toggleTheme(); }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-text-muted hover:text-text-primary hover:bg-surface-subtle border border-transparent hover:border-border-subtle transition-all duration-150 touch-manipulation"
                >
                    <span className="text-[13px] font-medium tracking-wide">
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </span>
                    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-subtle">
                        {isDark
                            ? <Sun size={14} strokeWidth={2} />
                            : <Moon size={14} strokeWidth={2} />}
                    </span>
                </button>

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
