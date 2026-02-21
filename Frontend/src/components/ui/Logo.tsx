import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
}

/**
 * Grip Branding: The "Apex Sentinel" (V7)
 * 
 * Final Refinement:
 * - Extended "G" Foundation: The lower arc now extends further towards the arrow,
 *   giving the logo more stability and a clearer "G" profile.
 * - Anti-Crop Padding: Shifted all coordinates inward by 8% to ensure the 12pt 
 *   stroke and arrowhead never bleed off the edges of the icon frame.
 * - Balanced Trajectory: The breakout arrow is centered in the gap with 
 *   perfectly balanced horizontal velocity.
 */
export const Logo: React.FC<LogoProps> = ({ className = '', size = 40 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ flexShrink: 0 }}
            shapeRendering="geometricPrecision"
        >
            <defs>
                <linearGradient id="grip-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" /> {/* emerald-500 */}
                    <stop offset="50%" stopColor="#06b6d4" /> {/* cyan-500 */}
                    <stop offset="100%" stopColor="#3b82f6" /> {/* blue-500 */}
                </linearGradient>
            </defs>

            {/* 
                THE FOUNDATION: Extended G-Arc
                Starts at (78, 68) to close the visual gap at the bottom.
                Ends at (62, 22) to provide a clean breakout window for the arrow.
            */}
            <path
                d="M 78 68 A 35 35 0 1 1 62 22"
                stroke="url(#grip-logo-gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
            />

            {/* 
                THE BREAKOUT: Pushed Tip at (92, 18)
                Retracted from edges (was 98/16) to prevent CSS/SVG cropping.
            */}
            <path
                d="M 35 65 L 48 52 L 58 62 L 92 18"
                stroke="url(#grip-logo-gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* 
                THE POINT: Precision Arrowhead
                Coordinated at (92, 18) to match the breakout terminal point.
            */}
            <path
                d="M 76 18 L 92 18 L 92 34"
                stroke="url(#grip-logo-gradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
};
