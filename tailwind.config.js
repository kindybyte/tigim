/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        // text colors — inverted for dark theme; ink-900 = brightest text
        ink: {
          DEFAULT: "#F1F5F9",
          900: "#F1F5F9",
          800: "#E2E8F0",
          700: "#CBD5E1",
          600: "#94A3B8",
        },
        // primary brand — vivid blue
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // accent — cyan
        teal: {
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
        },
        // dark surfaces
        surface: {
          DEFAULT: "#0A1628",
          muted: "#0F1E33",
        },
        panel: {
          DEFAULT: "#16243A",
          hover: "#1B2B43",
          muted: "#1F2D44",
          border: "#22324C",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(0,0,0,0.25), 0 1px 3px 0 rgba(0,0,0,0.2)",
        soft: "0 10px 30px -12px rgba(0,0,0,0.45)",
        ring: "0 0 0 1px rgba(255,255,255,0.06)",
        glow: "0 0 0 1px rgba(59,130,246,0.35), 0 8px 24px -8px rgba(59,130,246,0.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
