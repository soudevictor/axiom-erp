/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'hsl(220, 60%, 97%)',
          100: 'hsl(220, 55%, 93%)',
          200: 'hsl(220, 55%, 85%)',
          300: 'hsl(220, 55%, 72%)',
          400: 'hsl(220, 55%, 58%)',
          500: 'hsl(220, 60%, 48%)',
          600: 'hsl(220, 65%, 40%)',
          700: 'hsl(220, 65%, 32%)',
          800: 'hsl(220, 60%, 26%)',
          900: 'hsl(220, 55%, 20%)',
          950: 'hsl(220, 55%, 12%)',
        },
        surface: {
          50: 'hsl(220, 20%, 98%)',
          100: 'hsl(220, 18%, 96%)',
          200: 'hsl(220, 15%, 91%)',
          300: 'hsl(220, 12%, 82%)',
          400: 'hsl(220, 10%, 62%)',
          500: 'hsl(220, 8%, 46%)',
          600: 'hsl(220, 10%, 36%)',
          700: 'hsl(220, 12%, 26%)',
          800: 'hsl(220, 15%, 18%)',
          900: 'hsl(220, 18%, 12%)',
          950: 'hsl(220, 20%, 7%)',
        },
        success: {
          400: 'hsl(152, 60%, 50%)',
          500: 'hsl(152, 65%, 40%)',
          600: 'hsl(152, 68%, 32%)',
        },
        warning: {
          400: 'hsl(38, 95%, 60%)',
          500: 'hsl(38, 92%, 50%)',
          600: 'hsl(38, 88%, 42%)',
        },
        danger: {
          400: 'hsl(0, 72%, 60%)',
          500: 'hsl(0, 72%, 51%)',
          600: 'hsl(0, 72%, 42%)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
