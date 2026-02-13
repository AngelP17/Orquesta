import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
        ],
        serif: ["var(--font-instrument-serif)", "serif"],
      },
      colors: {
        graphite: {
          950: "#04070f",
          900: "#091120",
          800: "#0b1426",
          700: "#13203b",
        },
        accent: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#0ea5e9",
        },
        success: {
          400: "#34d399",
        },
        warning: {
          400: "#facc15",
        },
        danger: {
          400: "#fb7185",
        },
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow-shift": {
          "0%, 100%": {
            boxShadow:
              "0 0 0 1px rgba(56, 189, 248, 0.16), 0 16px 36px rgba(2, 6, 23, 0.46)",
          },
          "50%": {
            boxShadow:
              "0 0 0 1px rgba(34, 211, 238, 0.24), 0 20px 44px rgba(2, 6, 23, 0.52)",
          },
        },
        "row-pulse": {
          "0%": { backgroundColor: "rgba(30, 41, 59, 0.14)" },
          "100%": { backgroundColor: "rgba(51, 65, 85, 0.22)" },
        },
      },
      animation: {
        "fade-up": "fade-up 420ms ease-out",
        "glow-shift": "glow-shift 2.8s ease-in-out infinite",
        "row-pulse": "row-pulse 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
