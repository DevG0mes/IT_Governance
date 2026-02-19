/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brandDark: '#0a0a0a',
        brandGreen: '#10b981', // Emerald 500
        brandGreenHover: '#059669', // Emerald 600
      }
    },
  },
  plugins: [],
}