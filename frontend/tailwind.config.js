/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080808", // CRT Deactivated Black
        card: "#121212",       // Dark Slate / Carbon
        border: "#262626",     // Heavy Grid Line
        primary: "#ff2a2a",    // Hazard Red Accent (Only one primary accent)
        accent: "#cc1b1b",     // Muted Hazard Red
        muted: "#8a8a8a",      // Steel Muted Grey
        phosphor: "#eaeaea",   // White Phosphor Text
        green: "#4af626",      // Terminal Green for specific telemetry
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'Courier New', 'monospace'],
        display: ['Share Tech Mono', 'JetBrains Mono', 'monospace'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        'sm': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '0px',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(255, 42, 42, 0.25)',
        'phosphor': '0 0 10px rgba(234, 234, 234, 0.1)',
        'card': 'none', // Flat design, zero elevation shadows
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
