/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Invertite
        primary: {
          50:  '#eefbf3',
          100: '#d6f5e3',
          200: '#b0eacb',
          300: '#7bd8ab',
          400: '#43be84',
          500: '#1fa363',
          600: '#138350',
          700: '#106842',
          800: '#105337',
          900: '#0e452f',
          950: '#06271a',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        dark: {
          900: '#0a0f0d',
          800: '#111a15',
          700: '#162019',
          600: '#1c2a20',
          500: '#243328',
        },
        'invertite-dark': '#0B0F1A',
        'invertite-card': '#111827',
        'accent-teal': '#00C9A7',
        'accent-blue': '#3B82F6',
        'accent-gold': '#F5A623',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': "url('/assets/hero-pattern.svg')",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
