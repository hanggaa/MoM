/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b", // zinc-950
        card: "#18181b",       // zinc-900
        border: "#27272a",     // zinc-800
        primary: "#f59e0b",    // amber-500
        accent: "#d97706",     // amber-600
        muted: "#a1a1aa",      // zinc-400
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(245, 158, 11, 0.15)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
