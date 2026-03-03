import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-hover": "var(--card-hover)",
        gold: {
          DEFAULT: "#e8c547",
          dim: "#d4a932",
          light: "#f0d878",
          bg: "rgba(232, 197, 71, 0.15)",
        },
        royal: {
          bg: "#1a1028",
          card: "#2a1e3f",
          hover: "#352650",
          header: "#2d1b4e",
          "header-to": "#4a2d7a",
          light: "#a088c4",
          muted: "#8b6fc0",
          dark: "#6b5790",
          border: "rgba(232, 197, 71, 0.1)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
