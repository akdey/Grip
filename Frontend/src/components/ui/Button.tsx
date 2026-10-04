import React from 'react';
import { Loader2 } from 'lucide-react';
import { haptics } from '../../lib/haptics';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading,
    icon,
    className = '',
    disabled,
    onPointerDown,
    ...props
}) => {
    const baseClass = 'glass-button';
    const variantClass = variant === 'secondary' ? 'secondary' :
        variant === 'danger' ? 'bg-status-danger-bg text-status-danger-text border border-status-danger-border hover:bg-status-danger-solid hover:text-white' : '';

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!disabled && !isLoading) {
            haptics.selection();
        }
        onPointerDown?.(e);
    };

    return (
        <button
            onPointerDown={handlePointerDown}
            className={`${baseClass} ${variantClass} ${className} ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''} flex items-center justify-center gap-3 touch-manipulation`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
            <span className="font-black uppercase tracking-widest text-[11px] select-none">{children}</span>
        </button>
    );
};
