/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Habilita o modo escuro baseado em classe
  theme: {
    extend: {
      fontFamily: {
        rouge: ['"Rouge Script"', 'cursive'],
      },
      transitionProperty: {
        'colors': 'background-color, border-color, color, fill, stroke, box-shadow',
      },
    },
  },
  plugins: [],
}