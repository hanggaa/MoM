/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505", // Deep OLED Black
        card: "rgba(10, 10, 10, 0.6)", // Vantablack glass
        border: "rgba(255, 255, 255, 0.08)", // Thin white hairline
        primary: "#FFFFFF",    // Solid pure white
        accent: "#3b82f6",     // Premium blue
        muted: "#8e8e93",      // Apple-like muted grey
        pastel: {
          red: {
            bg: "rgba(239, 68, 68, 0.1)",
            text: "#FCA5A5",
          },
          blue: {
            bg: "rgba(59, 130, 246, 0.1)",
            text: "#93C5FD",
          },
          green: {
            bg: "rgba(16, 185, 129, 0.1)",
            text: "#6EE7B7",
          },
          yellow: {
            bg: "rgba(245, 158, 11, 0.15)",
            text: "#FDE047",
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'SF Pro Display', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '40px',
        'full': '9999px',
      },
      boxShadow: {
        'glow': '0 0 50px rgba(59, 130, 246, 0.15)',
        'card': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.32, 0.72, 0, 1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
