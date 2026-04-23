/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'serif'],
        cyber: ['Orbitron', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'sans-serif']
      },
      colors: {
        ink: '#101828',
        paper: '#f8f4ec',
        moss: '#516857',
        lagoon: '#0f766e',
        saffron: '#e7a72f',
        clay: '#c66a4a'
      },
      boxShadow: {
        soft: '0 24px 80px rgba(16, 24, 40, 0.14)'
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' }
        }
      },
      animation: {
        floaty: 'floaty 7s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
