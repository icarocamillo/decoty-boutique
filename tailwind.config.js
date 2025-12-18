/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", 
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        rouge: ['"Rouge Script"', 'cursive'],
      },
    },
  },
  plugins: [],
}