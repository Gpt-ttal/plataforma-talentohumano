import type { EstadoArea, EstadoGlobal } from "@pys/shared"
import { estadoAreaPill, estadoGlobalPill } from "@pys/shared"

/**
 * Pills de estado (global y de área). Única superficie visual del estado: consume
 * los mapas centralizados de `@pys/shared` (clases literales) para que Tailwind
 * purgue bien y para no reconstruir el string en cada lugar de uso.
 */
export function EstadoGlobalPill({ estado }: { estado: EstadoGlobal }) {
  const { className, dot, label } = estadoGlobalPill(estado)
  return (
    <span className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function EstadoAreaPill({ estado }: { estado: EstadoArea }) {
  const { className, label } = estadoAreaPill(estado)
  return <span className={className}>{label}</span>
}
