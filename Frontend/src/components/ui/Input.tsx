import React, { forwardRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '../../lib/haptics';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        // Trigger subtle haptic notification on error appearance
        useEffect(() => {
            if (error) {
                haptics.notification('error');
            }
        }, [error]);

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-[0.06em] mb-1.5 pl-1 select-none">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`
                        glass-input touch-manipulation
                        focus:ring-2 focus:ring-accent-solid/20 focus:border-border-focus transition-all duration-200
                        ${error ? 'border-status-danger-border focus:border-status-danger-solid focus:ring-status-danger-solid/20' : ''}
                        ${className}
                    `}
                    {...props}
                />
                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -4, x: -2 }}
                            animate={{ opacity: 1, y: 0, x: [ -2, 2, -1, 1, 0 ] }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.25 }}
                            className="mt-1.5 text-xs text-status-danger-text font-medium pl-1 select-none"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);

Input.displayName = 'Input';
