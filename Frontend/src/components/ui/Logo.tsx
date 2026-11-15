import React from 'react';

interface LogoProps {
    className?: string;
    size?: number;
}

/**
 * Grip Branding: The 4-Finger Geometric Clenched Fist "G" (2D)
 * 
 * Features:
 * - 4 distinct fingers: Finger 1 (top), Finger 2 (upper mid), Finger 3 (lower mid),
 *   and Finger 4 (connected to the left spine)
 * - Refined, slender left spine (40px width) for sleek balance and copyright uniqueness
 * - Isometric 30° parallel finger channels and crossbar shelf forming the "G"
 * - Filled with the light-theme greenish brand accent gradient (Emerald -> Nordic Petrol #0e4d66)
 */
export const Logo: React.FC<LogoProps> = ({ className = '', size = 40 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ flexShrink: 0 }}
            shapeRendering="geometricPrecision"
        >
            <defs>
                <linearGradient id="grip-logo-gradient" x1="15%" y1="10%" x2="85%" y2="90%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="35%" stopColor="#059669" />
                    <stop offset="70%" stopColor="#0e7490" />
                    <stop offset="100%" stopColor="#0e4d66" />
                </linearGradient>
            </defs>

            <g fillRule="evenodd">
                {/* Piece 1: Finger 1 (Top Chevron) */}
                <path
                    d="M 315.0 42.0 L 382.0 68.5 L 382.0 122.0 L 348.0 142.0 L 348.0 92.0 L 280.0 62.0 Z"
                    fill="url(#grip-logo-gradient)"
                />

                {/* Piece 2: Finger 2 (Upper-Middle Chevron) */}
                <path
                    d="M 267.0 69.7 L 334.0 96.2 L 334.0 149.7 L 300.0 169.7 L 300.0 119.7 L 232.0 89.7 Z"
                    fill="url(#grip-logo-gradient)"
                />

                {/* Piece 3: Finger 3 (Lower-Middle Chevron) */}
                <path
                    d="M 219.0 97.4 L 286.0 123.9 L 286.0 177.4 L 252.0 197.4 L 252.0 147.4 L 184.0 117.4 Z"
                    fill="url(#grip-logo-gradient)"
                />

                {/* Piece 4: Finger 4 & Palm Base (G Foundation with closer thumb & fingers) */}
                <path
                    d="M 142.0 142.0 L 171.0 125.1 L 238.0 151.6 L 238.0 205.1 L 204.0 225.1 L 204.0 178.0 L 182.0 169.0 L 182.0 313.15 C 182.0 323.0 188.0 327.88 198.75 327.88 L 313.45 327.88 C 324.0 327.88 330.5 323.0 330.5 313.15 L 330.5 253.24 L 235.0 253.24 L 235.0 225.24 L 378.55 142.36 L 383.98 144.86 L 383.98 313.15 C 383.98 358.0 358.0 380.57 321.2 380.57 L 195.0 380.57 C 160.0 380.57 142.0 355.0 142.0 313.15 Z"
                    fill="url(#grip-logo-gradient)"
                />
            </g>
        </svg>
    );
};
