import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          950: "#080c14",
          900: "#0b1320",
          850: "#101b2d",
          800: "#16253b",
          700: "#223552",
          600: "#364e75",
          400: "#708bb3",
          200: "#b9cee8",
        },
        bull: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
          glow: "rgba(16, 185, 129, 0.2)",
        },
        bear: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
          glow: "rgba(239, 68, 68, 0.2)",
        },
        bandar: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          glow: "rgba(245, 158, 11, 0.2)",
        },
        wave: {
          DEFAULT: "#06b6d4",
          light: "#22d3ee",
          glow: "rgba(6, 182, 212, 0.2)",
        }
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
