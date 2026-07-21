import { useState } from "react"
import { useDevolverCasoAArea } from "../../hooks/useFuncionarios"
import { ApiError } from "../../lib/api"

/**
 * Acción de Control Interno: devolver el caso a un área puntual para que lo
 * revise de nuevo (`DEVUELTO_POR_CI`, distinguible de un rechazo). Solo
 * disponible sobre un área ya resuelta (APROBADO/NO_APROBADO) — devolver una
 * pendiente no tiene sentido. Exige observación, mismo patrón de
 * confirmación inline que `AccionesArea`.
 */
export function DevolverAreaButton({
  funcionarioId,
  areaId,
}: {
  funcionarioId: string
  areaId: string
}) {
  const m = useDevolverCasoAArea()
  const [abierto, setAbierto] = useState(false)
  const [nota, setNota] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setError(null)
    try {
      await m.mutateAsync({ funcionarioId, areaId, observacion: nota })
      setAbierto(false)
      setNota("")
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No pudimos devolver el caso. Vuelve a intentarlo.",
      )
    }
  }

  const pending = m.isPending

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-navy-600 ring-1 ring-silver-300 transition-all duration-200 hover:bg-silver-50 hover:text-navy-800"
      >
        Devolver para revisión
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-silver-200 bg-silver-50 p-3">
      <label className="block text-xs font-medium text-navy-700">
        Motivo para devolver a esta área
      </label>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={2}
        autoFocus
        placeholder="Describe qué debe revisar el área…"
        className="mt-1.5 w-full resize-none rounded-lg border border-silver-300 bg-white p-2.5 text-sm text-navy-800 placeholder:text-silver-600 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
      />
      {error && <p className="mt-1 text-xs text-estado-rechazo">{error}</p>}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={pending || !nota.trim()}
          onClick={() => void confirmar()}
          className="rounded-lg bg-navy-deep px-3 py-1.5 text-xs font-medium text-white ring-1 ring-navy-900/20 transition-all duration-200 hover:shadow-luxe disabled:opacity-50"
        >
          {pending ? "Devolviendo…" : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setAbierto(false)
            setNota("")
            setError(null)
          }}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-navy-600 ring-1 ring-silver-300 transition-colors hover:bg-silver-100 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
