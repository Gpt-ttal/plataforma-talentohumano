import { iniciales } from "@pys/shared"

/**
 * Avatar — iniciales del colaborador en un disco navy con anillo oro. Reusa
 * `iniciales` de `@pys/shared`. Presentacional (sin estado ni I/O).
 */
const TAMANOS = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
} as const

export function Avatar({
  nombre,
  size = "md",
}: {
  nombre: string
  size?: keyof typeof TAMANOS
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-navy-50 to-white font-semibold text-navy-700 shadow-sm ring-1 ring-gold-200/60 ${TAMANOS[size]}`}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  )
}
