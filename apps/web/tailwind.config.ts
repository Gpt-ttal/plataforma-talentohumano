import type { Config } from "tailwindcss"

/**
 * Sistema de diseño "Paz y Salvo" — institucional premium (portado verbatim del
 * árbol Next, ajustado el `content` a la estructura Vite).
 *  · Navy profundo  → autoridad, marca, superficies oscuras.
 *  · Oro antiguo    → acento precioso, hitos, jerarquía (usar con moderación).
 *  · Perla / plata  → superficies claras, hairlines, fondos.
 */
const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../shared/src/**/*.{ts,tsx}"],
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
          50: "rgb(var(--surface-2) / <alpha-value>)",
          100: "rgb(var(--surface-2) / <alpha-value>)",
          200: "rgb(var(--border) / <alpha-value>)",
          300: "rgb(var(--hairline) / <alpha-value>)",
          400: "rgb(var(--faint) / <alpha-value>)",
          500: "rgb(var(--muted) / <alpha-value>)",
          600: "rgb(var(--muted) / <alpha-value>)",
        },
        ink: "rgb(var(--foreground) / <alpha-value>)",
        // Fondo base del sistema "C" — perla fría, plano y nítido.
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        elevated: "rgb(var(--elevated) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        // Alias de compatibilidad con el branding anterior.
        institucional: {
          DEFAULT: "#142943",
          dark: "#0A1830",
          light: "#EDF1F8",
        },
        // Semáforo de estados Paz y Salvo (armonizado con la paleta).
        estado: {
          pendiente: "rgb(var(--estado-pendiente) / <alpha-value>)",
          rechazo: "rgb(var(--estado-rechazo) / <alpha-value>)",
          rechazoBg: "rgb(var(--estado-rechazoBg) / <alpha-value>)",
          listo: "rgb(var(--estado-listo) / <alpha-value>)",
          listoBg: "rgb(var(--estado-listoBg) / <alpha-value>)",
          ok: "rgb(var(--estado-ok) / <alpha-value>)",
          okBg: "rgb(var(--estado-okBg) / <alpha-value>)",
          info: "rgb(var(--estado-info) / <alpha-value>)",
          infoBg: "rgb(var(--estado-infoBg) / <alpha-value>)",
          paz: "rgb(var(--estado-paz) / <alpha-value>)",
          pazBg: "rgb(var(--estado-pazBg) / <alpha-value>)",
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
