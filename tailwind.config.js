/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          base: '#020617', // slate-950
          surface: '#0F172A', // slate-900
          'surface-hover': '#1E293B', // slate-800
          primary: '#F59E0B', // amber-500
          accent: '#10B981', // emerald-500
          border: 'rgba(255, 255, 255, 0.1)',
          text: {
            main: '#F8FAFC', // slate-50
            muted: '#94A3B8', // slate-400
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
      }
    },
  },
  plugins: [],
}
