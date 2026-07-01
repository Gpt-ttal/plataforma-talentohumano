import type { ReactNode } from "react"

/**
 * EmptyState — estado vacío elegante para listas y bandejas. Presentacional:
 * título, mensaje, acción opcional, y o bien un `icono` pequeño (recuadro 48px) o
 * una `ilustracion` grande (spot illustration ~120px). Si se pasa `ilustracion`
 * tiene prioridad sobre `icono`.
 */
export function EmptyState({
  icono = "∅",
  ilustracion,
  titulo,
  mensaje,
  accion,
}: {
  icono?: ReactNode
  ilustracion?: ReactNode
  titulo: string
  mensaje?: string
  accion?: ReactNode
}) {
  return (
    <div className="premium-card flex flex-col items-center justify-center gap-3 rounded-xl border-dashed px-6 py-14 text-center">
      {ilustracion ? (
        <span className="text-faint" aria-hidden>
          {ilustracion}
        </span>
      ) : (
        <span
          className="grid h-12 w-12 place-items-center rounded-lg border border-border bg-surface-2 text-xl text-faint"
          aria-hidden
        >
          {icono}
        </span>
      )}
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-foreground">
          {titulo}
        </p>
        {mensaje && (
          <p className="mx-auto max-w-sm text-sm text-muted">{mensaje}</p>
        )}
      </div>
      {accion}
    </div>
  )
}
