import React from 'react';
import { motion } from 'framer-motion';

interface LoaderProps {
    fullPage?: boolean;
    text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ fullPage = false, text }) => {
    const loaderContent = (
        <div className="flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <div className="premium-loader" />
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-white/20 blur-xl rounded-full"
                />
            </div>
            {text && (
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[3px] animate-pulse">
                    {text}
                </p>
            )}
        </div>
    );

    if (fullPage) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505] glass-blur">
                {loaderContent}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-12">
            {loaderContent}
        </div>
    );
};
