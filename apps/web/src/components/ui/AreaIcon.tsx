import { iniciales } from "@pys/shared"
import { Icon, type IconName } from "./dash/Icon"

/**
 * AreaIcon — identidad visual de una dependencia de visto bueno.
 *
 * Mapa por nombre + fallback: las áreas con un concepto claro reciben un ícono de
 * línea dedicado; las áreas de sistema (Iceberg, Sinu, Eva) y cualquier dependencia
 * nueva caen al **monograma** (inicial en disco navy + anillo oro, patrón `Avatar`).
 */

/** Normaliza el nombre para el match: minúsculas, sin acentos, sin espacios extra. */
function norm(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
}

/** Reglas ordenadas palabraClave → ícono. El primer match gana. */
const REGLAS: readonly [string, IconName][] = [
  ["activo", "box"],
  ["sistema", "server"],
  ["tesoreria", "coins"],
  ["contabilidad", "calculator"],
  ["carnetiz", "badge"],
  ["biblioteca", "book"],
  ["correo", "mail-off"],
]

/**
 * Ícono dedicado de un área por su nombre, o `null` si no hay uno claro
 * (→ el componente cae al monograma). Puro, sin I/O.
 */
export function iconoDeArea(nombre: string): IconName | null {
  const n = norm(nombre)
  for (const [clave, icono] of REGLAS) {
    if (n.includes(clave)) return icono
  }
  return null
}

const TAMANOS = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
} as const

export function AreaIcon({
  nombre,
  variant = "disc",
  size = "md",
}: {
  nombre: string
  variant?: "disc" | "bare"
  size?: keyof typeof TAMANOS
}) {
  const icono = iconoDeArea(nombre)

  // Sin disco: glyph suelto para chips y cabeceras estrechas. Hereda el color del
  // contexto (`currentColor`) para verse bien sobre chip claro o navy activo.
  if (variant === "bare") {
    return icono ? (
      <Icon name={icono} className="h-4 w-4" />
    ) : (
      <span
        aria-hidden
        className="grid h-4 w-4 place-items-center text-[10px] font-semibold"
      >
        {iniciales(nombre)}
      </span>
    )
  }

  // Disco estilo Avatar: navy-50 + anillo oro, con ícono o monograma.
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy-50 to-card text-navy-700 shadow-sm ring-1 ring-gold-200/60 dark:from-surface-2 dark:to-card dark:text-foreground ${TAMANOS[size]}`}
    >
      {icono ? (
        <Icon name={icono} className="h-4 w-4" />
      ) : (
        <span className="text-xs font-semibold">{iniciales(nombre)}</span>
      )}
    </span>
  )
}
