/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand (Cobalto Elétrico) ─────────────────────────────────────────
        brand: {
          DEFAULT: '#2563eb',
          hover: '#3b82f6',
          active: '#1d4ed8',
          subtle: 'rgba(37, 99, 235, 0.12)',
          secondary: '#38bdf8',
        },

        // ── Canvas & Surfaces (Dynamic via CSS vars) ─────────────────────────
        canvas: {
          DEFAULT: 'var(--color-canvas)',
          base: 'var(--color-canvas-base)',
          surface: 'var(--color-canvas-surface)',
          elevated: 'var(--color-canvas-elevated)',
        },

        // ── Borders & Dividers ────────────────────────────────────────────────
        border: {
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          hover: 'var(--color-border-hover)',
        },

        // ── Typography & Content ──────────────────────────────────────────────
        content: {
          primary: 'var(--color-content-primary)',
          muted: 'var(--color-content-muted)',
          disabled: 'var(--color-content-disabled)',
        },

        // ── Semantic Operational States ───────────────────────────────────────
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
      },

      // ── Font Families ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      // ── Extended Font Sizes ───────────────────────────────────────────────────
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // ── Spacing Scale (Strict 4px/8px Modular Grid) ────────────────────────
      // Tailwind's default scale already follows 4px increments.
      // Only additions needed for the 64px topbar height token (h-16 = 64px ✓)
      // and 48px row height (h-12 = 48px ✓) — both already in default scale.

      // ── Border Radius ─────────────────────────────────────────────────────────
      borderRadius: {
        DEFAULT: '0.5rem',
      },

      // ── Box Shadows (elevation system) ───────────────────────────────────────
      boxShadow: {
        'elevation-1': 'var(--shadow-elevation-1)',
        'elevation-2': 'var(--shadow-elevation-2)',
        'elevation-3': 'var(--shadow-elevation-3)',
        'brand-glow': '0 4px 24px 0 rgba(37, 99, 235, 0.28)',
      },

      // ── Transition Timing ─────────────────────────────────────────────────────
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
