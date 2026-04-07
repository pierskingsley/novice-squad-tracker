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
    },
  },
  plugins: [],
}
