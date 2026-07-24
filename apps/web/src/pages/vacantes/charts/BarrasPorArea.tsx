import type { SerieCategoriaVacante } from "@pys/shared"
import BarrasDimension from "../../panel/charts/BarrasDimension"

/** Vacantes por área/programa solicitante — reusa el chart genérico de barras horizontales. */
export default function BarrasPorArea({ porArea }: { porArea: SerieCategoriaVacante[] }) {
  const data = [...porArea]
    .sort((a, b) => b.total - a.total)
    .map((s) => ({ clave: s.label, valor: s.total }))
  return <BarrasDimension data={data} max={8} />
}
