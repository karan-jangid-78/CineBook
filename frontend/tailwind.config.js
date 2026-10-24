/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          bg: '#0B0F19',
          surface: '#121826',
          card: '#1A2234',
          border: '#2A344A',
          gold: '#E5A93C',
          goldLight: '#F5BE58',
          accent: '#E50914',
          accentHover: '#B80710',
          textMuted: '#94A3B8',
          seatAvailable: '#1E293B',
          seatSelected: '#E5A93C',
          seatHeld: '#F97316',
          seatBooked: '#334155'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cinzel', 'Georgia', 'serif']
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(229, 169, 60, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(229, 169, 60, 0.8)' }
        }
      }
    },
  },
  plugins: [],
}
