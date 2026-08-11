/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F6F3", // Warm Bone Canvas
        card: "#FFFFFF",       // Pure White Surface
        border: "#EAEAEA",     // Ultra Light Gray Divider
        primary: "#111111",    // Off-Black Text/UI Solid
        accent: "#787774",     // Muted Gray Secondary
        muted: "#787774",
        pastel: {
          red: {
            bg: "#FDEBEC",
            text: "#9F2F2D",
          },
          blue: {
            bg: "#E1F3FE",
            text: "#1F6C9F",
          },
          green: {
            bg: "#EDF3EC",
            text: "#346538",
          },
          yellow: {
            bg: "#FBF3DB",
            text: "#956400",
          }
        }
      },
      fontFamily: {
        sans: ['SF Pro Display', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'glow': 'none',
        'card': '0 2px 8px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
