/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f6ee',
          100: '#e7ebdb',
          200: '#d5ddbf',
          300: '#b9c79a',
          500: '#6f7d45',
          600: '#556b2f',
          700: '#465627'
        }
      },
      boxShadow: {
        soft: '0 14px 34px rgba(60, 78, 35, 0.10)',
        glow: '0 0 0 1px rgba(85, 107, 47, 0.22), 0 20px 48px rgba(85, 107, 47, 0.16)'
      }
    }
  },
  plugins: []
}
