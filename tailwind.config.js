/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1C1C1E',
          raised: '#2C2C2E',
          overlay: '#3A3A3C',
        },
        offsuit: {
          grey: '#8E8E93',
          muted: '#636366',
        },
      },
      borderRadius: {
        card: '12px',
        module: '20px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.35)',
        module: '0 4px 16px rgba(0, 0, 0, 0.45)',
      },
      backgroundImage: {
        'feature-gradient':
          'linear-gradient(135deg, #E8D5FF 0%, #FFF3C4 45%, #FFD6E0 100%)',
      },
      fontFamily: {
        sans: [
          'SF Pro Text',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      animation: {
        'card-deal': 'card-deal 0.35s ease-out both',
        'chip-bet': 'chip-bet 0.3s ease-out both',
      },
    },
  },
  plugins: [],
};
