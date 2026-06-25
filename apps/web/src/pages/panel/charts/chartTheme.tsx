import type { ReactNode } from "react"

/**
 * Tema compartido de las gráficas del Panel: tooltip y estado vacío con el
 * lenguaje del Sello (superficie blanca, hairline silver, texto navy, números
 * tabulares mono). Recharts inyecta `active`/`payload` al pasar este componente
 * como `content` del `<Tooltip>`.
 */

interface PayloadItem {
  name?: string
  value?: number
  color?: string
  payload?: { label?: string; clave?: string; color?: string }
}

export function ChartTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean
  payload?: PayloadItem[]
  total?: number
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]!
  const nombre = p.payload?.label ?? p.payload?.clave ?? p.name ?? ""
  const valor = typeof p.value === "number" ? p.value : 0
  const color = p.payload?.color ?? p.color
  const porcentaje =
    typeof total === "number" && total > 0
      ? ` · ${Math.round((valor / total) * 100)}%`
      : ""

  return (
    <div className="rounded-lg border border-silver-200 bg-white px-3 py-2 shadow-luxe">
      <div className="flex items-center gap-2">
        {color && (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: color }}
          />
        )}
        <span className="text-xs font-semibold text-navy-900">{nombre}</span>
      </div>
      <div className="mt-0.5 font-mono text-xs tabular-nums text-silver-600">
        {valor.toLocaleString("es-CO")}
        {porcentaje}
      </div>
    </div>
  )
}

/** Marcador de gráfica sin datos, con la misma altura visual de un panel. */
export function VacioChart({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-40 place-items-center rounded-lg bg-silver-50 px-4 text-center text-sm text-silver-600">
      {children}
    </div>
  )
}
