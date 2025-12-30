/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg: {
                    canvas: 'rgb(var(--bg-canvas) / <alpha-value>)',
                    surface: 'rgb(var(--bg-surface) / <alpha-value>)',
                    raised: 'rgb(var(--bg-surface-raised) / <alpha-value>)',
                },
                text: {
                    primary: 'rgb(var(--text-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                    muted: 'rgb(var(--text-muted) / <alpha-value>)',
                },
                accent: {
                    DEFAULT: 'rgb(var(--accent-primary) / <alpha-value>)',
                    glow: 'rgb(var(--accent-glow) / <alpha-value>)',
                },
                border: {
                    DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
                    subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: 'var(--radius-md)',
                lg: 'var(--radius-lg)',
            },
        },
    },
    plugins: [],
}
