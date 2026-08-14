/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A", // Deactivated CRT Black
        card: "#121212",       // Terminal Box Dark
        border: "rgba(255, 255, 255, 0.12)", // Rigid framing lines
        primary: "#EAEAEA",    // White Phosphor Foreground
        accent: "#FF2A2A",     // Aviation/Hazard Red
        muted: "#666666",      // Muted matrix gray
        green: "#4AF626",      // Terminal Phosphor Green
        pastel: {
          red: {
            bg: "rgba(255, 42, 42, 0.1)",
            text: "#FF2A2A",
          },
          blue: {
            bg: "rgba(234, 234, 234, 0.08)",
            text: "#EAEAEA",
          },
          green: {
            bg: "rgba(74, 246, 38, 0.1)",
            text: "#4AF626",
          },
          yellow: {
            bg: "rgba(255, 200, 0, 0.1)",
            text: "#FFC800",
          }
        }
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Times New Roman', 'Georgia', 'serif'],
      },
      borderRadius: {
        'sm': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '9999px', // preserve only for avatar/perfect circles if any, but elements should be square
      },
      boxShadow: {
        'glow': '0 0 12px rgba(255, 42, 42, 0.25)',
        'card': 'none',
      },
      transitionTimingFunction: {
        'spring': 'linear', // brutalist transitions are instantaneous or linear
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
