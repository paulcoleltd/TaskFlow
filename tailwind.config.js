/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#3B82F6', dark: '#2563EB' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F8FAFC' },
        brand: {
          navy: '#0B1437',
          card: '#111C44',
          cardHover: '#1B254B',
          border: '#1F3461',
          input: '#0B2060',
        },
        status: {
          todo: '#64748B',
          'in-progress': '#3B82F6',
          review: '#F59E0B',
          done: '#10B981',
          blocked: '#EF4444',
        },
        priority: {
          low: '#22C55E',
          medium: '#F59E0B',
          high: '#EF4444',
          critical: '#8B5CF6',
        },
      },
      boxShadow: {
        card: '0 4px 24px 0 rgba(0,0,0,0.35)',
        glow: '0 0 20px rgba(59,130,246,0.25)',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #0B1437 0%, #0D1B4B 100%)',
      },
    },
  },
  plugins: [],
};


