import { useState } from "react"
import { useGenerarLiquidacion } from "../../hooks/useFuncionarios"
import { ApiError } from "../../lib/api"

/**
 * Acción de Talento Humano: generar la liquidación (avisa a Control Interno).
 * Disponible cuando el funcionario está LISTO_PARA_LIQUIDAR. Reutilizable en el
 * detalle (modal/página) y en la cola de la vista de TH (`compact`).
 *
 * La acción es irreversible (avanza el estado global), así que pide una
 * confirmación inline —sin modal— antes de disparar.
 */
export function GenerarLiquidacionButton({
  funcionarioId,
  compact = false,
}: {
  funcionarioId: string;
  compact?: boolean;
}) {
  const m = useGenerarLiquidacion()
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmar() {
    setError(null)
    try {
      await m.mutateAsync(funcionarioId)
      setConfirmando(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos generar la liquidación. Vuelve a intentarlo.")
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
            {compact ? "¿Confirmar?" : "¿Generar la liquidación?"}
          </span>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-md bg-gold-sheen ${sizing} font-semibold text-navy-900 shadow-sm ring-1 ring-gold-600/30 transition-all duration-200 hover:shadow-gold disabled:opacity-50`}
          >
            {pending ? "Generando…" : "Sí, generar"}
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
            ? "group inline-flex items-center gap-1.5 rounded-md bg-gold-sheen px-2.5 py-1 text-xs font-semibold text-navy-900 shadow-sm ring-1 ring-gold-600/30 transition-all duration-200 hover:shadow-gold"
            : "group inline-flex items-center gap-2 rounded-lg bg-gold-sheen px-4 py-2 text-sm font-semibold text-navy-900 shadow-luxe ring-1 ring-gold-600/30 transition-all duration-200 hover:shadow-gold"
        }
      >
        <span className="h-1.5 w-1.5 rounded-full bg-navy-800 transition-transform group-hover:scale-125" />
        Generar liquidación
      </button>
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  );
}
