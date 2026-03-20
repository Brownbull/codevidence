import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Direction 2 tokens
        'nav-bg': 'rgb(15 23 42)',   // slate-900 — always dark nav
        'body-bg': 'rgb(248 250 252)', // slate-50

        // Theme-aware semantic tokens
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          raised: 'rgb(var(--color-surface-raised) / <alpha-value>)',
          inset: 'rgb(var(--color-surface-inset) / <alpha-value>)',
        },
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'th-text': {
          primary: 'rgb(var(--color-text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        'th-hover': 'rgb(var(--color-hover) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
