/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vesta: {
          red: '#C8102E',
          'red-dark': '#A50D24',
          navy: '#003087',
          'navy-light': '#EBF0F8',
        },
      },
      keyframes: {
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(-10px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
}
