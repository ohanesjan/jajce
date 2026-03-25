import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5efe3",
        parchment: "#fbf7ef",
        soil: "#7b5a43",
        bark: "#3b312b",
        sky: "#8eb9c8",
        sage: "#a9b59d",
      },
      fontFamily: {
        serif: [
          "Iowan Old Style",
          "Palatino Linotype",
          "Book Antiqua",
          "Georgia",
          "serif",
        ],
        sans: [
          "Avenir Next",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 18px 60px rgba(42, 34, 28, 0.12)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 1px 1px, rgba(59,49,43,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};

export default config;
