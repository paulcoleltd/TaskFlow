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
        primary: { DEFAULT: '#4B8CF7', dark: '#3A7AE8' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F8FAFC' },
        brand: {
          navy:      '#06091A',
          card:      '#0C1526',
          cardHover: '#122040',
          border:    '#1C3054',
          input:     '#091020',
        },
        status: {
          todo:         '#64748B',
          'in-progress':'#4B8CF7',
          review:       '#F59E0B',
          done:         '#10B981',
          blocked:      '#EF4444',
        },
        priority: {
          low:      '#22C55E',
          medium:   '#F59E0B',
          high:     '#EF4444',
          critical: '#8B5CF6',
        },
        accent: {
          blue:   '#4B8CF7',
          violet: '#7B6CF8',
          indigo: '#6366F1',
        },
      },
      boxShadow: {
        card:         '0 4px 32px 0 rgba(0,0,0,0.50)',
        'card-hover': '0 8px 40px 0 rgba(0,0,0,0.60)',
        glow:         '0 0 20px rgba(75,140,247,0.20)',
        'glow-lg':    '0 0 40px rgba(75,140,247,0.25)',
        'glow-accent':'0 4px 20px rgba(123,108,248,0.30)',
        inner:        'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      borderRadius: {
        xl:  '16px',
        '2xl': '20px',
      },
      backgroundImage: {
        'gradient-navy':   'linear-gradient(145deg, #06091A 0%, #0A1232 50%, #0C0A24 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4B8CF7 0%, #7B6CF8 100%)',
        'gradient-card':   'linear-gradient(145deg, #0C1526 0%, #0F1C3A 100%)',
        'gradient-sidebar':'linear-gradient(180deg, #07091F 0%, #06091A 100%)',
        'gradient-active': 'linear-gradient(135deg, rgba(75,140,247,0.18) 0%, rgba(123,108,248,0.12) 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};


