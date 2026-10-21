/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          fill: 'var(--color-brand-fill)',
          'fill-hover': 'var(--color-brand-fill-hover)',
          subtle: 'var(--color-brand-subtle)',
        },
        canvas: {
          DEFAULT: 'var(--color-canvas)',
          base: 'var(--color-canvas-base)',
          surface: 'var(--color-canvas-surface)',
          elevated: 'var(--color-canvas-elevated)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          hover: 'var(--color-border-hover)',
        },
        content: {
          primary: 'var(--color-content-primary)',
          muted: 'var(--color-content-muted)',
          disabled: 'var(--color-content-disabled)',
        },
        state: {
          success: 'var(--color-state-success)',
          'success-subtle': 'var(--color-state-success-subtle)',
          warning: 'var(--color-state-warning)',
          'warning-subtle': 'var(--color-state-warning-subtle)',
          danger: 'var(--color-state-danger)',
          'danger-subtle': 'var(--color-state-danger-subtle)',
          info: 'var(--color-state-info)',
          'info-subtle': 'var(--color-state-info-subtle)',
        },
        overlay: 'var(--color-overlay)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        overlay: 'var(--shadow-overlay)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};
