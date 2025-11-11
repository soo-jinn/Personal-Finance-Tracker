module.exports = {
  // Tailwind v3+: use `content` (remove `purge` to avoid upgrade warnings)
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        // Mapúa-inspired Palette
        'mapua-red': '#BA0C2F',
        'mapua-gold': '#FDB913',
        'income': '#00C49F',
        'expense': '#FA5A7D',

        // Light Mode
        'light-bg': '#F8F9FA', // Very light gray
        'light-card': '#FFFFFF',
        'light-text': '#212529',
        'light-text-secondary': '#6C757D',

        // Dark Mode
        'dark-bg': '#121212', // Very dark gray
        'dark-card': '#1E1E1E', // Slightly lighter dark
        'dark-text': '#E9ECEF',
        'dark-text-secondary': '#ADB5BD',
        'dark-border': '#343A40',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-bar': {
          '0%': { width: '0%' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'progress-bar': 'progress-bar 1s ease-out forwards',
      }
    },
  },
  plugins: [],
}