/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // ← must be 'class', not 'media'
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
