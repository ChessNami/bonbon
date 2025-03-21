/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'], // Set Poppins as the default sans-serif font
      },
      screens: {
        'lg': '1160px', // Adjust the breakpoint for lg to 1160px
      },
    },
  },
  plugins: [],
}