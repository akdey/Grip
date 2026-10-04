/**
 * Apple-style tactile feedback utility using the Web Vibration API.
 * Adheres to WWDC "Designing Audio-Haptic Experiences":
 * - Causality: Fired directly on interaction (pointer-down/commit)
 * - Utility: Subtly tuned durations (8-30ms) rather than jarring long vibrations
 * - Safety: Silently degrades gracefully on unsupported platforms/devices
 */

export const haptics = {
    /**
     * Subtle tick for discrete changes: picker wheels, segmented switches, slider increments, key taps.
     */
    selection: () => {
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(8);
            }
        } catch {
            // Ignore in cross-origin / unsupported contexts
        }
    },

    /**
     * Physical impact feedback corresponding to Apple UIImpactFeedbackGenerator styles.
     */
    impact: (style: 'light' | 'medium' | 'heavy' = 'light') => {
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                const duration = style === 'light' ? 12 : style === 'medium' ? 22 : 35;
                navigator.vibrate(duration);
            }
        } catch {
            // Ignore
        }
    },

    /**
     * Meaningful outcome feedback: success, warning, or error.
     */
    notification: (type: 'success' | 'warning' | 'error' = 'success') => {
        try {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                if (type === 'success') {
                    navigator.vibrate([12, 40, 15]);
                } else if (type === 'warning') {
                    navigator.vibrate([20, 50, 20]);
                } else {
                    navigator.vibrate([30, 60, 30, 60, 40]);
                }
            }
        } catch {
            // Ignore
        }
    }
};
