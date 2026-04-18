import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        mode: {
          cold: "#7dd3fc",
          warm: "#fbbf24",
          hot: "#f97316",
          handoff: "#a78bfa",
        },
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(249,115,22,0.6)" },
          "70%": { boxShadow: "0 0 0 10px rgba(249,115,22,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(249,115,22,0)" },
        },
      },
      animation: {
        "pulse-ring": "pulseRing 1.6s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
