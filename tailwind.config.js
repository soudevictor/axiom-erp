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

        // ── Canvas & Surfaces (Dark Corporativo) ──────────────────────────────
        canvas: {
          DEFAULT: '#09090b',
          base: '#09090b',
          surface: '#11141b',
          elevated: '#181d27',
        },

        // ── Borders & Dividers ────────────────────────────────────────────────
        border: {
          subtle: '#222734',
          strong: '#333b4f',
          hover: '#2563eb',
        },

        // ── Typography & Content ──────────────────────────────────────────────
        content: {
          primary: '#f8fafc',
          muted: '#94a3b8',
          disabled: '#475569',
        },

        // ── Semantic Operational States ───────────────────────────────────────
        state: {
          success: '#10b981',
          'success-subtle': 'rgba(16, 185, 129, 0.12)',
          warning: '#f59e0b',
          'warning-subtle': 'rgba(245, 158, 11, 0.12)',
          danger: '#ef4444',
          'danger-subtle': 'rgba(239, 68, 68, 0.12)',
          info: '#0284c7',
          'info-subtle': 'rgba(2, 132, 199, 0.12)',
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
        'elevation-1':
          '0 1px 3px 0 rgb(0 0 0 / 0.12), 0 1px 2px -1px rgb(0 0 0 / 0.12)',
        'elevation-2':
          '0 4px 6px -1px rgb(0 0 0 / 0.18), 0 2px 4px -2px rgb(0 0 0 / 0.12)',
        'elevation-3':
          '0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.15)',
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
