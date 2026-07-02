import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#06070d",
        ink: {
          DEFAULT: "#f2f3f7",
          700: "#c3c7d4",
          500: "#8f94a6",
          400: "#676d80",
        },
        money: {
          DEFAULT: "#f0b429",
          soft: "#fde084",
        },
        reach: {
          DEFAULT: "#22d3ee",
          soft: "#7dd3fc",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-geist-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
