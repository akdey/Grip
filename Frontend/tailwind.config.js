/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--color-bg-page)",
                foreground: "var(--color-text-primary)",
            },
            padding: {
                'safe': 'env(safe-area-inset-bottom)',
            }
        },
    },
    plugins: [],
}
