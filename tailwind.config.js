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
      colors: {
        primary: "#1E3A8A", // Deep Blue
        secondary: "#2563EB", // Bright Blue
        highlight: "#93C5FD", // Soft Blue
        background: "#F1F5F9", // Light Blue Gray
        textDark: "#334155", // Dark Gray Blue
      },
      screens: {
        'lg': '1160px', // Adjust the breakpoint for lg to 1160px
        'xl': '1440px', // Add an extra-large breakpoint
      },
    },
  },
  plugins: [],
};
