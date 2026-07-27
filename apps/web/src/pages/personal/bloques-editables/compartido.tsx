import type { ReactNode } from "react"
import { ApiError } from "../../../lib/api"

/**
 * Helpers compartidos por los editores de bloques satélite de la hoja de vida
 * 360°. Extraídos verbatim del monolito `BloquesEditables.tsx` (Fase 5 del plan
 * de modularización) — sin cambios de comportamiento.
 */

export const inputCls =
  "rounded-lg border border-silver-300 bg-card px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50 dark:text-foreground dark:border-border"
export const labelCls = "flex flex-col gap-1"
export const labelTextCls = "text-[11px] uppercase tracking-wide text-silver-600"

export function mensajeError(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback
}

/**
 * Campo etiquetado: fuente única de "label persistente + control" para los
 * editores de Personal y Vacantes. El `placeholder` del control queda como hint;
 * el `label` (siempre visible) es lo que anuncian los lectores de pantalla.
 */
export function CampoForm({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className={labelCls}>
      <span className={labelTextCls}>{label}</span>
      {children}
    </label>
  )
}

/**
 * Mensaje de error de formulario, anunciado a lectores de pantalla (`role="alert"`).
 * Devuelve `null` si no hay contenido, así el sitio de uso escribe
 * `<MensajeError>{error}</MensajeError>` sin el guardia `{error && …}`.
 */
export function MensajeError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="text-sm text-estado-rechazo">
      {children}
    </p>
  )
}

export function BotonAbrir({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-silver-300 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:border-gold-400 dark:border-border dark:text-foreground"
    >
      {children}
    </button>
  )
}

export function FilaGuardarCancelar({
  pending,
  onGuardar,
  onCancelar,
  guardandoLabel = "Guardando…",
  guardarLabel = "Guardar cambios",
}: {
  pending: boolean
  onGuardar: () => void
  onCancelar: () => void
  guardandoLabel?: string
  guardarLabel?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onGuardar}
        disabled={pending}
        className="inline-flex min-h-[44px] items-center rounded-lg bg-navy-deep px-3 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 disabled:opacity-50"
      >
        {pending ? guardandoLabel : guardarLabel}
      </button>
      <button
        type="button"
        onClick={onCancelar}
        disabled={pending}
        className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold text-silver-600 hover:text-navy-800"
      >
        Cancelar
      </button>
    </div>
  )
}

/** Fila de un ítem 1-N con "Eliminar" → confirmación inline de 1 clic. */
export function FilaEliminable({
  children,
  pending,
  confirmando,
  onPedirConfirmar,
  onCancelarConfirmar,
  onConfirmar,
}: {
  children: ReactNode
  pending: boolean
  confirmando: boolean
  onPedirConfirmar: () => void
  onCancelarConfirmar: () => void
  onConfirmar: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-silver-200 px-3 py-2 text-sm dark:border-border">
      <span className="min-w-0 text-navy-800 dark:text-foreground">{children}</span>
      {confirmando ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={pending}
            className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold text-estado-rechazo"
          >
            Confirmar
          </button>
          <button
            type="button"
            onClick={onCancelarConfirmar}
            className="inline-flex min-h-[44px] items-center px-2 text-xs text-silver-600"
          >
            Cancelar
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={onPedirConfirmar}
          className="inline-flex min-h-[44px] shrink-0 items-center px-2 text-xs font-medium text-silver-600 hover:text-estado-rechazo"
        >
          Eliminar
        </button>
      )}
    </li>
  )
}
