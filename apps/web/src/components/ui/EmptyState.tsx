import type { ReactNode } from "react"

/**
 * EmptyState — estado vacío elegante para listas y bandejas. Presentacional:
 * ícono (nodo), título, mensaje y acción opcional.
 */
export function EmptyState({
  icono = "∅",
  titulo,
  mensaje,
  accion,
}: {
  icono?: ReactNode
  titulo: string
  mensaje?: string
  accion?: ReactNode
}) {
  return (
    <div className="premium-card flex flex-col items-center justify-center gap-3 rounded-xl border-dashed px-6 py-14 text-center">
      <span
        className="grid h-12 w-12 place-items-center rounded-lg border border-silver-200 bg-silver-50 text-xl text-silver-400"
        aria-hidden
      >
        {icono}
      </span>
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-navy-800">
          {titulo}
        </p>
        {mensaje && (
          <p className="mx-auto max-w-sm text-sm text-silver-600">{mensaje}</p>
        )}
      </div>
      {accion}
    </div>
  )
}
