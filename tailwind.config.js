/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'sans-serif'],
        display: ['"Archivo Black"', 'Impact', 'sans-serif'],
        chalk: ['Caveat', 'cursive'],
      },
      colors: {
        // Chalk & Iron palette
        ci: {
          chalk:      '#F5F1E8',
          'chalk-deep': '#ECE5D4',
          ink:        '#181614',
          'ink-soft': '#55504A',
          'ink-mute': '#857F76',
          rule:       '#D8CFBB',
          red:        '#D13A2E',
          'red-deep': '#A82A20',
          navy:       '#2B3A5C',
          yellow:     '#F4C430',
          'dark-bg':  '#14120F',
          'dark-card':'#1F1C18',
          'dark-rule':'#302B24',
          'dark-ink': '#F5F1E8',
        },
        // Keep legacy tokens for coach pages
        vesta: {
          red: '#D13A2E',
          'red-dark': '#A82A20',
          navy: '#2B3A5C',
          'navy-light': '#EBF0F8',
        },
      },
      boxShadow: {
        'ci':    '3px 3px 0 #181614',
        'ci-lg': '4px 4px 0 #181614',
        'ci-xl': '6px 6px 0 #D13A2E',
        'ci-dark':    '3px 3px 0 #F5F1E8',
        'ci-dark-lg': '4px 4px 0 #F5F1E8',
      },
      borderRadius: {
        ci: '4px',
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
