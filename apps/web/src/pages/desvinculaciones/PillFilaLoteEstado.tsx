import type { FilaLoteEstado } from "@pys/shared"
import { filaLoteEstadoPill } from "@pys/shared"

/** Pill de estado de una fila del lote (Regla del Semáforo Único, vía @pys/shared). */
export function PillFilaLoteEstado({ estado }: { estado: FilaLoteEstado }) {
  const { className, label } = filaLoteEstadoPill(estado)
  return <span className={className}>{label}</span>
}
