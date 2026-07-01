import { Link } from "react-router-dom"
import { hrefCon } from "@pys/shared"

/**
 * Paginacion — server-driven por `?pagina=`. El padre pasa la página actual y el
 * resto de la query (`params`) para preservarla. La página 1 va sin `?pagina=`
 * para mantener URLs limpias.
 */
const BTN =
  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-all"
const BTN_ON =
  "bg-card/85 text-foreground ring-border hover:bg-card hover:text-foreground hover:ring-gold-300 hover:shadow-luxe"
const BTN_OFF = "cursor-not-allowed bg-surface-2/80 text-faint ring-border"

export function Paginacion({
  basePath,
  params,
  pagina,
  totalPaginas,
  total,
}: {
  basePath: string
  params: Record<string, string | number | undefined | null>
  pagina: number
  totalPaginas: number
  total: number
}) {
  const resultados = `${total} resultado${total === 1 ? "" : "s"}`
  if (totalPaginas <= 1) {
    return <p className="text-xs text-muted">{resultados}</p>
  }

  const hrefPagina = (n: number) =>
    hrefCon(basePath, { ...params, pagina: n > 1 ? n : undefined })

  const sinPrev = pagina <= 1
  const sinNext = pagina >= totalPaginas

  return (
    <nav
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/55 px-3 py-2"
      aria-label="Paginación"
    >
      <p className="text-xs text-muted">
        Página <span className="font-semibold text-foreground">{pagina}</span> de{" "}
        {totalPaginas} · {resultados}
      </p>
      <div className="flex items-center gap-1.5">
        {sinPrev ? (
          <span className={`${BTN} ${BTN_OFF}`} aria-disabled>
            ← Anterior
          </span>
        ) : (
          <Link to={hrefPagina(pagina - 1)} className={`${BTN} ${BTN_ON}`}>
            ← Anterior
          </Link>
        )}
        {sinNext ? (
          <span className={`${BTN} ${BTN_OFF}`} aria-disabled>
            Siguiente →
          </span>
        ) : (
          <Link to={hrefPagina(pagina + 1)} className={`${BTN} ${BTN_ON}`}>
            Siguiente →
          </Link>
        )}
      </div>
    </nav>
  )
}
