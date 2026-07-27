import type { ReactNode } from "react"
import { Icon, type IconName } from "../../components/ui/dash/Icon"

/**
 * Primitivas visuales de la suite de Configuración (adaptadas del `SettingsUI.tsx`
 * de SIGAF al design system de este repo: tokens semánticos, hairline-primero, oro
 * reservado). El `Panel` contenedor se reusa de `dash/primitives`; aquí viven las
 * piezas propias de esta suite: mosaicos de resumen, filas de dato y esqueleto.
 */

/**
 * Mosaico de resumen: etiqueta mono + valor destacado + nota. Superficie sobria,
 * separada por hairline (Regla Hairline-Primero). El ícono es opcional y va en un
 * disco `surface-2`, nunca en oro (el oro se reserva a hito/acción).
 */
export function SummaryTile({
  label,
  value,
  sub,
  icono,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icono?: IconName
}) {
  return (
    <article className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      {icono && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-muted">
          <Icon name={icono} className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs leading-5 text-muted">{sub}</p>}
      </div>
    </article>
  )
}

/**
 * Fila de dato: etiqueta a la izquierda, valor a la derecha, separadas por hairline.
 * Para listas de identidad/estado (Seguridad, Sistema). `mono` alinea el valor con
 * `tabular-nums` cuando es un dato técnico comparable.
 */
export function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: ReactNode
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <span className="shrink-0 text-xs font-medium text-muted">{label}</span>
      <span
        className={`min-w-0 truncate text-right text-sm text-foreground ${
          mono ? "font-mono tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/** Esqueleto de carga con la forma de un `Panel` (evita salto de layout). */
export function LoadingPanel({ filas = 3 }: { filas?: number }) {
  return (
    <section className="rounded-xl border border-border bg-card/92 p-5 shadow-luxe">
      <div className="mb-4 h-4 w-40 animate-pulse rounded bg-surface-2" />
      <div className="space-y-2.5">
        {Array.from({ length: filas }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
    </section>
  )
}
