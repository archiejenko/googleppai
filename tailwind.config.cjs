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
                    critical: 'rgb(var(--accent-critical) / <alpha-value>)',
                },
                border: {
                    DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
                    subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
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
                    'off-white': '#F5F5F5', // Nordic Brutalist V2 Accent
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
                sans: ['"Neue Haas Grotesk Display Pro"', '"Neue Haas Grotesk Text Pro"', '"Neue Haas Grotesk"', '"NeueHaasGroteskDisp"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['"Neue Haas Grotesk Display Pro"', '"Neue Haas Grotesk Text Pro"', '"Neue Haas Grotesk"', '"NeueHaasGroteskDisp"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['"Neue Haas Grotesk Display Pro"', '"Neue Haas Grotesk Text Pro"', '"Neue Haas Grotesk"', '"NeueHaasGroteskDisp"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '0px',
                sm: '0px',
                md: '0px',
                lg: '0px',
                xl: '0px',
                '2xl': '0px',
                '3xl': '0px',
                full: '0px', // Strict enforcement
            },
        },
    },
    plugins: [],
}
