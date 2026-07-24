import type { AprobacionPresupuestoVacante, EstadoVacante, FaseVacante, StatusVacante } from "@pys/shared"
import { aprobacionVacantePill, estadoCapturadoVacantePill, estadoVacantePill, faseVacantePill } from "@pys/shared"

/**
 * Pills del módulo de Vacantes (4 ejes independientes: STATUS derivado, estado
 * capturado, aprobación presupuestal y fase). Cada una consume su propio mapa
 * centralizado de `@pys/shared` — cero lógica de color aquí (Regla del
 * Semáforo Único). Distinto de `EstadoPill.tsx`, que es específico de Paz y Salvo.
 */
export function EstadoVacantePill({ status }: { status: StatusVacante }) {
  const { className, dot, label } = estadoVacantePill(status)
  return (
    <span className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function EstadoCapturadoVacantePill({ estado }: { estado: EstadoVacante }) {
  const { className, dot, label } = estadoCapturadoVacantePill(estado)
  return (
    <span className={className}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function AprobacionVacantePill({ aprobacion }: { aprobacion: AprobacionPresupuestoVacante }) {
  const { className, label } = aprobacionVacantePill(aprobacion)
  return <span className={className}>{label}</span>
}

export function FaseVacantePill({ fase }: { fase: FaseVacante }) {
  const { className, label } = faseVacantePill(fase)
  return <span className={className}>{label}</span>
}
