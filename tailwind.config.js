/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './table.html'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        'fade-up-delay': 'fadeUp 0.7s ease-out 0.15s forwards',
        'fade-up-delay-2': 'fadeUp 0.7s ease-out 0.3s forwards',
        'card-in': 'cardIn 0.5s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cardIn: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  safelist: [
    // Category badge colors (injected via JS)
    'bg-slate-100', 'text-slate-700', 'ring-slate-200', 'dark:bg-slate-800', 'dark:text-slate-200', 'dark:ring-slate-700',
    'bg-emerald-50', 'text-emerald-800', 'ring-emerald-200', 'dark:bg-emerald-950/60', 'dark:text-emerald-300', 'dark:ring-emerald-800',
    'bg-amber-50', 'text-amber-800', 'ring-amber-200', 'dark:bg-amber-950/60', 'dark:text-amber-300', 'dark:ring-amber-800',
    'bg-pink-50', 'text-pink-800', 'ring-pink-200', 'dark:bg-pink-950/60', 'dark:text-pink-300', 'dark:ring-pink-800',
    'bg-blue-50', 'text-blue-800', 'ring-blue-200', 'dark:bg-blue-950/60', 'dark:text-blue-300', 'dark:ring-blue-800',
    'bg-violet-50', 'text-violet-800', 'ring-violet-200', 'dark:bg-violet-950/60', 'dark:text-violet-300', 'dark:ring-violet-800',
    // Status badge colors (injected via JS)
    'bg-green-100', 'text-green-800', 'ring-green-200', 'dark:bg-green-950/50', 'dark:text-green-300', 'dark:ring-green-800',
    'bg-violet-100', 'text-violet-800', 'ring-violet-200', 'dark:bg-violet-950/50', 'dark:text-violet-300', 'dark:ring-violet-800',
    'bg-amber-100', 'text-amber-800', 'ring-amber-200', 'dark:bg-amber-950/50', 'dark:text-amber-300', 'dark:ring-amber-800',
    'bg-rose-100', 'text-rose-600', 'ring-rose-200', 'dark:bg-rose-800', 'dark:text-rose-300', 'dark:ring-rose-600',
    'text-slate-500', 'dark:text-slate-400', 'dark:ring-slate-600',
    'dark:text-slate-300', 'dark:ring-slate-700',
  ],
};
