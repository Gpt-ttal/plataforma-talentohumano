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
}

export function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName
  className?: string
}) {
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
    </svg>
  )
}
