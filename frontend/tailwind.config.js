/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
          950: '#0c1a3d',
        },
        teal: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        surface: {
          900: '#060b14',
          800: '#0d1525',
          700: '#111e33',
          600: '#1a2940',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'Inter', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      screens: {
        'xs': '480px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'fade-up':        'fadeUp 0.35s ease both',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-slow':     'pulse 3s infinite ease-in-out',
      },
    },
  },
  plugins: [],
}
