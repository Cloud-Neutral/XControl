/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./routes/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./islands/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
