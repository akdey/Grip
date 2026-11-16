import React from 'react';

interface FooterProps {
    className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
    return (
        <footer className={className ?? "mt-auto pt-3 text-center pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-5 px-4 select-none"}>
            <p className="text-[10px] font-normal text-text-muted/40 tracking-wider">
                Grip <span className="opacity-40">•</span> Developed & Engineered by{' '}
                <a
                    href="https://portfolio.akdey.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-text-muted/60 hover:text-text-secondary font-medium transition-colors underline decoration-border-subtle/50 hover:decoration-text-muted underline-offset-2"
                >
                    AMIT KUMAR DEY
                </a>
            </p>
        </footer>
    );
};
