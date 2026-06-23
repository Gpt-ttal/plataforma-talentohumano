import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Branding institucional — Corporación Universitaria Americana
        institucional: {
          DEFAULT: "#1565C0",
          dark: "#0D47A1",
          light: "#E3F2FD",
        },
        // Semáforo de estados Paz y Salvo
        estado: {
          pendiente: "#9E9E9E",
          rechazo: "#C62828",
          listo: "#8E24AA",
          listoBg: "#E1BEE7",
          paz: "#2E7D32",
          pazBg: "#E8F5E9",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
