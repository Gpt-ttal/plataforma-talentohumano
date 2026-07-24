import type { CatalogoVacanteItem, SerieCategoriaVacante } from "@pys/shared"
import BarrasDimension from "../../panel/charts/BarrasDimension"

function nombrePorClave(catalogo: CatalogoVacanteItem[], clave: string): string {
  return catalogo.find((c) => c.clave === clave)?.nombre ?? clave
}

/** De dónde vinieron los ya contratados (fuente de reclutamiento), clave resuelta contra el catálogo. */
export default function BarrasFuentesContratados({
  fuentesContratados,
  catalogo,
}: {
  fuentesContratados: SerieCategoriaVacante[]
  catalogo: CatalogoVacanteItem[]
}) {
  const data = [...fuentesContratados]
    .sort((a, b) => b.total - a.total)
    .map((s) => ({ clave: nombrePorClave(catalogo, s.label), valor: s.total }))
  return <BarrasDimension data={data} max={8} />
}
