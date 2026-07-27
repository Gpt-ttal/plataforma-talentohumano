import type { ReactNode } from "react"

/**
 * Primitivos de lectura etiqueta/valor compartidos por las fichas de detalle
 * (antes duplicados verbatim en las páginas dedicadas, hoy los modales
 * `VacanteDetalle` y `Expediente`). Rejilla de 2→3 columnas; el valor usa
 * `tabular-nums` (Regla Tabular) y cae a "—" si vacío.
 */
export function Campos({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm md:grid-cols-3">{children}</dl>
}

export function Campo({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-silver-600">{etiqueta}</dt>
      <dd className="mt-0.5 break-words font-medium text-navy-700 tabular-nums dark:text-foreground">
        {valor || "—"}
      </dd>
    </div>
  )
}
