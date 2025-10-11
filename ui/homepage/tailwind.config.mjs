import defaultTheme from "npm:tailwindcss/defaultTheme.js";
import forms from "npm:@tailwindcss/forms";
import typography from "npm:@tailwindcss/typography";

/** @type {import("npm:tailwindcss").Config} */
const config = {
  content: [
    "./routes/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./islands/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./static/**/*.{html,md}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [forms, typography],
};

export default config;
