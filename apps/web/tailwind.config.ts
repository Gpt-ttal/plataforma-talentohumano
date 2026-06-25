import type { Config } from "tailwindcss"

/**
 * Sistema de diseño "Paz y Salvo" — institucional premium (portado verbatim del
 * árbol Next, ajustado el `content` a la estructura Vite).
 *  · Navy profundo  → autoridad, marca, superficies oscuras.
 *  · Oro antiguo    → acento precioso, hitos, jerarquía (usar con moderación).
 *  · Perla / plata  → superficies claras, hairlines, fondos.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EDF1F8",
          100: "#D2DCEC",
          200: "#A3B5D3",
          300: "#6F86B0",
          400: "#42598A",
          500: "#22406B",
          600: "#1A3457",
          700: "#142943",
          800: "#0E1F35",
          900: "#0A1830",
          950: "#06101F",
          DEFAULT: "#142943",
        },
        gold: {
          50: "#FBF6E9",
          100: "#F4E8C6",
          200: "#E9D196",
          300: "#DAB55E",
          400: "#CBA135",
          500: "#B68D40",
          600: "#98722F",
          700: "#785824",
          800: "#5C4319",
          DEFAULT: "#B68D40",
        },
        silver: {
          50: "#F6F7FA",
          100: "#EEF0F5",
          200: "#E0E4EC",
          300: "#CCD2DE",
          400: "#AEB6C6",
          500: "#8B93A6",
          600: "#697080",
        },
        ink: "#16202E",
        // Fondo base del sistema "C" — perla fría, plano y nítido.
        bg: "#F4F7FB",
        // Alias de compatibilidad con el branding anterior.
        institucional: {
          DEFAULT: "#142943",
          dark: "#0A1830",
          light: "#EDF1F8",
        },
        // Semáforo de estados Paz y Salvo (armonizado con la paleta).
        estado: {
          pendiente: "#8B93A6",
          rechazo: "#A4231F",
          listo: "#B68D40",
          listoBg: "#F4E8C6",
          ok: "#16936A",
          okBg: "#E4F5EE",
          info: "#3B6FD4",
          infoBg: "#E8EFFC",
          paz: "#1E7A52",
          pazBg: "#E3F2EA",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
      },
      boxShadow: {
        luxe: "0 1px 2px rgba(16,28,51,0.04), 0 12px 28px -14px rgba(16,28,51,0.22)",
        "luxe-lg":
          "0 2px 6px rgba(16,28,51,0.05), 0 24px 48px -20px rgba(16,28,51,0.30)",
        gold: "0 8px 24px -10px rgba(182,141,64,0.55)",
        "inset-gold": "inset 0 0 0 1px rgba(182,141,64,0.35)",
      },
      backgroundImage: {
        "gold-sheen":
          "linear-gradient(135deg, #E9D196 0%, #CBA135 42%, #B68D40 58%, #DAB55E 100%)",
        "navy-deep":
          "linear-gradient(160deg, #0E1F35 0%, #142943 55%, #1A3457 100%)",
      },
      letterSpacing: {
        luxe: "0.18em",
      },
    },
  },
  plugins: [],
}

export default config
