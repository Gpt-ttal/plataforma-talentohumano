/**
 * Icon — set SVG del Panel de control (unión de los iconos que usaban InicioPage
 * y DashboardPage). Trazo único, `viewBox` 24×24, `currentColor`. No usar emojis.
 */

export type IconName =
  | "arrow"
  | "check"
  | "clock"
  | "file"
  | "grid"
  | "lock"
  | "refresh"
  | "users"
  | "warning"
  // Set ampliado (UI general + íconos por área). Mismo formato 24×24/currentColor.
  | "building"
  | "shield-check"
  | "search"
  | "edit"
  | "plus"
  | "close"
  | "chevron-down"
  | "mail"
  | "mail-off"
  | "calendar"
  | "coins"
  | "download"
  | "filter"
  | "eye"
  | "logout"
  | "badge"
  | "book"
  | "box"
  | "server"
  | "database"
  | "briefcase"
  | "iceberg"
  | "grad-cap"
  | "calculator"
  | "chart-bar"

const ICON_PATH: Record<IconName, string> = {
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "M20 6L9 17l-5-5",
  clock: "M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M8 13h8M8 17h5",
  grid: "M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2ZM7 11V7a5 5 0 0 1 10 0v4",
  refresh: "M20 11a8 8 0 0 0-14.9-4M4 5v6h6M4 13a8 8 0 0 0 14.9 4M20 19v-6h-6",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  warning:
    "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01",
  building:
    "M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M9 7h2M9 11h2M9 15h2M19 21V11a2 2 0 0 0-2-2h-2",
  "shield-check": "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4",
  search: "M11 11m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M21 21l-4.3-4.3",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z",
  plus: "M12 5v14M5 12h14",
  close: "M18 6 6 18M6 6l12 12",
  "chevron-down": "M6 9l6 6 6-6",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM2 7l10 6 10-6",
  // mail-off: el sub-trazo de tachado va en oro (ver render); aquí solo el sobre.
  "mail-off": "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM2 7l10 6 10-6",
  calendar: "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM16 2v4M8 2v4M3 10h18",
  coins:
    "M8 8m-6 0a6 3 0 1 0 12 0 6 3 0 1 0-12 0M2 8v4c0 1.7 2.7 3 6 3s6-1.3 6-3V8M2 12v4c0 1.7 2.7 3 6 3 .8 0 1.6-.1 2.3-.2M14 12.5c2.9-.2 5-1.3 5-2.5",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  filter: "M22 3H2l8 9.5V19l4 2v-8.5L22 3Z",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  badge:
    "M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 10m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M5 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M14 9h5M14 13h5",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
  box: "M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8",
  server: "M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01",
  database:
    "M12 5m-8 0a8 3 0 1 0 16 0 8 3 0 1 0-16 0M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  briefcase:
    "M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18",
  // iceberg: la línea de flotación (waterline) va en oro (ver render); aquí el hielo.
  iceberg: "M12 3l5 6H7l5-6ZM7 9l-4 4 9 8 9-8-4-4",
  "grad-cap": "M22 9 12 5 2 9l10 4 10-4ZM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v5",
  calculator:
    "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM8 6h8v3H8zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01",
  "chart-bar": "M3 3v18h18M8 17v-5M13 17V9M18 17v-8",
}

/**
 * Set en runtime de los nombres de ícono disponibles. Lo consume la guarda de
 * coherencia `MODULOS[].icono ⊆ iconos` (tests/iconos-modulos.test.ts) para que
 * un módulo no declare un ícono inexistente (que pintaría `<path d={undefined}>`).
 */
export const ICONOS_DISPONIBLES: ReadonlySet<string> = new Set(Object.keys(ICON_PATH));

// Sub-trazo de acento oro para íconos que lo llevan (tachado de mail-off, waterline
// del iceberg). Se pinta encima con stroke literal del Sello, no `currentColor`.
const ACENTO_ORO: Partial<Record<IconName, string>> = {
  "mail-off": "M3 3l18 18",
  iceberg: "M3 13h18",
}

export function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName
  className?: string
}) {
  const oro = ACENTO_ORO[name]
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={ICON_PATH[name]} />
      {oro && <path d={oro} stroke="#B68D40" />}
    </svg>
  )
}
