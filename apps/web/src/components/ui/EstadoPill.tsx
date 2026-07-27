import type { EstadoArea, EstadoGlobal, EstadoVinculacion } from "@pys/shared"
import { estadoAreaPill, estadoGlobalPill, estadoVinculacionPill } from "@pys/shared"

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

/** Pill de estado de vínculo del empleado (punto + etiqueta), fuente única de la estructura. */
export function EstadoVinculacionPill({ estado }: { estado: EstadoVinculacion }) {
  const { className, dot, label } = estadoVinculacionPill(estado)
  return (
    <span className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
