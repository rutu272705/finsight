/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Schibsted Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Base backgrounds mapped to crisp clean whites and off-whites
        navy: {
          950: "#FFFFFF",
          900: "#F8FAFC",
          800: "#F1F5F9",
        },
        // Panel and surface colors
        char: {
          900: "#F8FAFC",
          800: "#FFFFFF",
          700: "#F1F5F9",
          600: "#E2E8F0",
        },
        line: "#E2E8F0",
        // Typography colors - high contrast, dark slate
        ink: {
          DEFAULT: "#0F172A", // slate-900
          soft: "#334155",    // slate-700
          mute: "#64748B",    // slate-500
        },
        // Primary accent - sleek modern blue/indigo
        teal: {
          300: "#0284C7",
          400: "#0369A1",
          500: "#0284C7",
          600: "#075985",
        },
        // Financial gains / losses / flat indicators
        gain: {
          DEFAULT: "#16A34A",
          dim: "#15803D",
        },
        loss: {
          DEFAULT: "#E11D48",
          dim: "#BE123C",
        },
        flat: "#64748B",
        amber: {
          400: "#D97706",
          500: "#B45309",
        },
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        panel: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
