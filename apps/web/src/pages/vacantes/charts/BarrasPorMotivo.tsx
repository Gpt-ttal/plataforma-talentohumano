import type { CatalogoVacanteItem, SerieCategoriaVacante } from "@pys/shared"
import BarrasDimension from "../../panel/charts/BarrasDimension"

function nombrePorClave(catalogo: CatalogoVacanteItem[], clave: string): string {
  return catalogo.find((c) => c.clave === clave)?.nombre ?? clave
}

/** Vacantes por motivo (reemplazo, cargo nuevo, etc.) — clave resuelta contra el catálogo. */
export default function BarrasPorMotivo({
  porMotivo,
  catalogo,
}: {
  porMotivo: SerieCategoriaVacante[]
  catalogo: CatalogoVacanteItem[]
}) {
  const data = [...porMotivo]
    .sort((a, b) => b.total - a.total)
    .map((s) => ({ clave: nombrePorClave(catalogo, s.label), valor: s.total }))
  return <BarrasDimension data={data} max={8} />
}
