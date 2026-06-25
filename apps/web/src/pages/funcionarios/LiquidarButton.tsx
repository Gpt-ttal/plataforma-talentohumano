import { useState } from "react"
import { useRegistrarPazYSalvo } from "../../hooks/useFuncionarios"
import { ApiError } from "../../lib/api"

/**
 * Acción de Control Interno: registrar la liquidación final (cierre → paz y salvo).
 * Disponible cuando el funcionario está LIQUIDACION_GENERADA (TH ya generó y avisó).
 * Reutilizable en el detalle (modal/página) y en la bandeja de CI (`compact`).
 *
 * El cierre es irreversible (es el hito del trámite), así que pide una
 * confirmación inline —sin modal— antes de disparar.
 */
export function LiquidarButton({
  funcionarioId,
  compact = false,
}: {
  funcionarioId: string;
  compact?: boolean;
}) {
  const m = useRegistrarPazYSalvo()
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null)
    try {
      await m.mutateAsync(funcionarioId)
      setConfirmando(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos registrar el paz y salvo. Vuelve a intentarlo.")
    }
  }

  const pending = m.isPending
  const sizing = compact ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm";

  if (confirmando) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`font-medium text-navy-700 ${compact ? "text-xs" : "text-sm"}`}
          >
            {compact ? "¿Confirmar el paz y salvo?" : "¿Registrar el paz y salvo?"}
          </span>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-md bg-navy-deep ${sizing} font-semibold text-white shadow-sm ring-1 ring-gold/40 transition-all duration-200 hover:shadow-gold hover:ring-gold disabled:opacity-50`}
          >
            {pending ? "Registrando…" : "Sí, registrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmando(false);
              setError(null);
            }}
            disabled={pending}
            className={`rounded-md ${sizing} font-medium text-navy-600 ring-1 ring-silver-300 transition-colors hover:bg-silver-50 disabled:opacity-50`}
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs text-estado-rechazo">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className={
          compact
            ? "group inline-flex items-center gap-1.5 rounded-md bg-navy-deep px-2.5 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-gold/40 transition-all duration-200 hover:shadow-gold hover:ring-gold"
            : "group inline-flex items-center gap-2 rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition-all duration-200 hover:shadow-gold hover:ring-gold"
        }
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gold-sheen transition-transform group-hover:scale-125" />
        {compact ? "Registrar · Paz y salvo" : "Registrar liquidación · Paz y salvo"}
      </button>
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  );
}
