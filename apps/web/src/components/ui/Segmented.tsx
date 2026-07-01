import { Link } from "react-router-dom"

/**
 * Segmented — control segmentado (pestañas) server-driven por la URL. Cada opción
 * es un `Link`; el activo lo decide quien renderiza a partir de la query. Se usa
 * para la "vista" de supervisión del catálogo (Todo / Talento Humano / Control Interno).
 */
export interface OpcionSegmento {
  value: string
  label: string
  href: string
}

export function Segmented({
  opciones,
  activo,
  etiqueta,
}: {
  opciones: OpcionSegmento[]
  activo: string
  etiqueta?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/70 p-1 shadow-luxe"
    >
      {opciones.map((o) => {
        const sel = o.value === activo
        return (
          <Link
            key={o.value}
            to={o.href}
            role="tab"
            aria-selected={sel}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
              sel
                ? "bg-navy-deep text-white shadow-luxe ring-1 ring-gold/35"
                : "text-muted hover:bg-card hover:text-foreground"
            }`}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
