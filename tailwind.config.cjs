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
                    deep: 'rgb(var(--bg-deep) / <alpha-value>)',
                },
                text: {
                    primary: 'rgb(var(--text-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
                    muted: 'rgb(var(--text-muted) / <alpha-value>)',
                },
                accent: {
                    DEFAULT: 'rgb(var(--accent-primary) / <alpha-value>)',
                    glow: 'rgb(var(--accent-glow) / <alpha-value>)',
                    critical: 'rgb(var(--accent-critical) / <alpha-value>)',
                },
                border: {
                    DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
                    subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
                },
                status: {
                    success: 'rgb(var(--status-success) / <alpha-value>)',
                    warning: 'rgb(var(--status-warning) / <alpha-value>)',
                    danger: 'rgb(var(--status-danger) / <alpha-value>)',
                },
                oast: {
                    accent: 'rgb(var(--oast-accent) / <alpha-value>)',
                    navy: 'rgb(var(--oast-navy) / <alpha-value>)',
                    surface: 'rgb(var(--oast-surface) / <alpha-value>)',
                    text: {
                        primary: 'rgb(var(--oast-text-primary) / <alpha-value>)',
                        secondary: 'rgb(var(--oast-text-secondary) / <alpha-value>)',
                    },
                    border: 'rgb(var(--oast-border) / <alpha-value>)',
                },
            },
            spacing: {
                'section': 'clamp(4rem, 10vh, 8rem)',
            },
            borderWidth: {
                '3': '3px',
            },
            boxShadow: {
                'brutal': '6px 6px 0px 0px var(--tw-shadow-color)',
                'brutal-sm': '3px 3px 0px 0px var(--tw-shadow-color)',
            },
            transitionTimingFunction: {
                'press': 'linear',
            },
            transitionDuration: {
                'press': '150ms',
            },
            animation: {
                'spotlight': 'spotlight 2s ease .75s 1 forwards',
            },
            keyframes: {
                spotlight: {
                    '0%': {
                        opacity: 0,
                        transform: 'translate(-72%, -62%) scale(0.5)',
                    },
                    '100%': {
                        opacity: 1,
                        transform: 'translate(-50%,-40%) scale(1)',
                    },
                },
            },
            fontFamily: {
                sans: ['"DM Sans"', 'sans-serif'],
                display: ['Oswald', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
                body: ['"DM Sans"', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '8px',
                sm: '6px',
                md: '8px',
                lg: '12px',
                xl: '16px',
                '2xl': '20px',
                full: '9999px',
            },
        },
    },
    plugins: [],
}
