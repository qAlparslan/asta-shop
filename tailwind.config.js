/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Sayfa geneli aksan — navbar bordo ile aynı ton */
        brand: {
          DEFAULT: '#9f2133',
          hover: '#861c2c',
          muted: '#fdf2f2',
        },
        /** Navbar / logo — görseldeki lacivert + bordo */
        asta: {
          navy: '#1a2332',
          maroon: '#9f2133',
          'maroon-hover': '#861c2c',
          mutedBar: '#ececee',
          barText: '#4b5563',
          icon: '#6b7280',
          /** Hakkımızda vitrin başlığı / istatistik sayıları — lacivert-bordo ile uyumlu altın ton */
          gold: '#c5a065',
          'gold-soft': '#d9c49a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
};
