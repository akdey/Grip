import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="mt-auto py-6 text-center pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-4 px-4 select-none">
            <p className="text-xs sm:text-[11px] font-medium text-text-muted tracking-tight">
                Grip • Developed & Engineered by{' '}
                <a
                    href="https://portfolio.akdey.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-primary hover:text-accent-text font-semibold transition-colors underline decoration-border-default hover:decoration-accent-text underline-offset-2"
                >
                    AMIT KUMAR DEY
                </a>
            </p>
        </footer>
    );
};
