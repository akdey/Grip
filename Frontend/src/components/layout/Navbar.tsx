import React, { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    BarChart3,
    Plus,
    LayoutGrid,
    Briefcase
} from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
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

/**
 * Mac Dock Magnifying Item:
 * Dynamically scales up icons based on proximity to the cursor or touch gesture,
 * mirroring macOS Dock fluid physics.
 */
const DockItem: React.FC<{
    item: NavItem;
    mouseX: MotionValue<number>;
}> = ({ item, mouseX }) => {
    const ref = useRef<HTMLAnchorElement>(null);

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    // Mac Dock parabolic magnification curve (scales up to 1.28x with slight upward lift)
    const scaleSync = useTransform(distance, [-80, 0, 80], [1, 1.28, 1]);
    const scale = useSpring(scaleSync, {
        mass: 0.1,
        stiffness: 280,
        damping: 18,
    });

    const ySync = useTransform(distance, [-80, 0, 80], [0, -3.5, 0]);
    const y = useSpring(ySync, {
        mass: 0.1,
        stiffness: 280,
        damping: 18,
    });

    return (
        <NavLink
            ref={ref}
            to={item.path}
            onPointerDown={() => haptics.selection()}
            className={({ isActive }) => `
                relative flex-1 flex flex-col items-center justify-center py-2 px-2.5 min-h-[54px] rounded-[22px] transition-colors duration-150 touch-manipulation select-none
                ${isActive ? 'text-text-primary font-bold' : 'text-text-muted hover:text-text-primary'}
            `}
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <motion.div
                            layoutId="dockActiveCapsule"
                            className="absolute inset-y-1 inset-x-1 bg-black/[0.05] dark:bg-white/[0.12] rounded-[18px] border border-black/[0.04] dark:border-white/[0.08] -z-10 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        />
                    )}
                    <motion.div
                        style={{ scale, y }}
                        whileTap={{ scale: 0.88 }}
                        className="flex items-center justify-center py-0.5"
                    >
                        <item.icon
                            size={20}
                            strokeWidth={isActive ? 2.5 : 2}
                            className={`transition-colors ${isActive ? 'text-text-primary' : 'text-text-muted'}`}
                        />
                    </motion.div>
                    <span
                        className={`text-[10px] tracking-tight mt-0.5 leading-none transition-all ${
                            isActive ? 'font-bold text-text-primary' : 'font-medium text-text-muted'
                        }`}
                    >
                        {item.label}
                    </span>
                </>
            )}
        </NavLink>
    );
};

export const Navbar: React.FC = () => {
    const mouseX = useMotionValue(Infinity);

    return (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-50 md:hidden flex justify-center pointer-events-none px-4 pb-[env(safe-area-inset-bottom,0px)]">
            <nav
                aria-label="Mobile Navigation Dock"
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                onTouchMove={(e) => {
                    if (e.touches[0]) mouseX.set(e.touches[0].clientX);
                }}
                onTouchEnd={() => mouseX.set(Infinity)}
                onTouchCancel={() => mouseX.set(Infinity)}
                className="pointer-events-auto relative flex items-center justify-between gap-1 p-1.5 w-full max-w-[364px] rounded-[30px] dock-liquid-glass transition-all"
            >
                {NAV_ITEMS.map((item) => {
                    if (item.isAction) {
                        return (
                            <div key={item.path} className="flex items-center justify-center px-1 relative -top-3">
                                <NavLink
                                    to={item.path}
                                    onPointerDown={() => haptics.impact('medium')}
                                    className="block touch-manipulation focus:outline-none"
                                    aria-label="Add new entry"
                                >
                                    {/* Hybrid Android FAB + Apple Glass: Elevated, monochrome, stable size */}
                                    <motion.div
                                        whileTap={{ scale: 0.92 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        className="w-12 h-12 rounded-full bg-text-primary text-text-inverse flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.35)] border-[3.5px] border-surface active:brightness-95 transition-all"
                                    >
                                        <Plus size={24} strokeWidth={2.75} />
                                    </motion.div>
                                </NavLink>
                            </div>
                        );
                    }

                    return (
                        <DockItem
                            key={item.path}
                            item={item}
                            mouseX={mouseX}
                        />
                    );
                })}
            </nav>
        </div>
    );
};
