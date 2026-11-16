import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="mt-auto pt-6 text-center pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-6 px-4 select-none">
            <p className="text-[10px] font-normal text-text-muted/45 tracking-wider">
                Grip <span className="opacity-40">•</span> Developed & Engineered by{' '}
                <a
                    href="https://portfolio.akdey.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted/65 hover:text-text-secondary font-medium transition-colors underline decoration-border-subtle/50 hover:decoration-text-muted underline-offset-2"
                >
                    AMIT KUMAR DEY
                </a>
            </p>
        </footer>
    );
};
