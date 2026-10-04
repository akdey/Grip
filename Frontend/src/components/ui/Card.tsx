import React from 'react';
import { haptics } from '../../lib/haptics';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    const handlePointerDown = () => {
        if (onClick) {
            haptics.selection();
        }
    };

    return (
        <div
            className={`glass-card rounded-3xl p-6 md:p-8 ${onClick ? 'cursor-pointer active:scale-[0.985] transition-transform duration-100 ease-out touch-manipulation' : ''} ${className}`}
            onClick={onClick}
            onPointerDown={handlePointerDown}
        >
            {children}
        </div>
    );
};
