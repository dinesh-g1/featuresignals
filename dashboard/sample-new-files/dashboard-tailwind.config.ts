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
        stone: {
          50: "#fafaf9", 100: "#f5f5f4", 200: "#e7e5e4",
          300: "#d6d3d1", 400: "#a8a29e", 500: "#78716c",
          600: "#57534e", 700: "#44403c", 800: "#292524", 900: "#1c1917",
        },
        accent: {
          light: "#4fd1c5",
          DEFAULT: "#0d9488", // The core Teal
          dark: "#0f766e",
        },
        // Semantic status colors
        operational: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
        warning: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(41, 37, 36, 0.04)',
        'float': '0 10px 40px rgba(41, 37, 36, 0.08)',
      }
    },
  },
  plugins: [],
};
export default config;