import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        smoke: "#141414",
        ash: "#1c1c1c",
        mist: "#2a2a2a",
        fog: "#3a3a3a",
        bone: "#e8e6e1",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        unfold: {
          "0%": { opacity: "0", maxHeight: "0px" },
          "100%": { opacity: "1", maxHeight: "600px" },
        },
      },
      animation: {
        fadeIn: "fadeIn 300ms ease-out",
        unfold: "unfold 400ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
