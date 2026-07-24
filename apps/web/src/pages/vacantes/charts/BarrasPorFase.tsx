import { FASES_VACANTE, FASE_VACANTE_LABEL } from "@pys/shared"
import type { SerieCategoriaVacante } from "@pys/shared"
import BarrasDimension from "../../panel/charts/BarrasDimension"

/**
 * Vacantes por fase del proceso — orden fijo de las 7 fases (no por magnitud),
 * para leerse como un embudo del reclutamiento en vez de un ranking.
 */
export default function BarrasPorFase({ porFase }: { porFase: SerieCategoriaVacante[] }) {
  const totales = new Map(porFase.map((s) => [s.label, s.total]))
  const data = FASES_VACANTE.map((f) => ({ clave: FASE_VACANTE_LABEL[f], valor: totales.get(f) ?? 0 }))
  return <BarrasDimension data={data} max={FASES_VACANTE.length} />
}
