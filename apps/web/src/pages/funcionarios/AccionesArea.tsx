import { useState } from "react"
import type { EstadoArea } from "@pys/shared"
import { useCambiarEstadoArea } from "../../hooks/useFuncionarios"
import { ApiError } from "../../lib/api"

interface Accion {
  estado: EstadoArea;
  label: string;
  clase: string;
  requiereNota: boolean;
}

const BTN_BASE =
  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-50 ring-1";

const ACCIONES: Accion[] = [
  {
    estado: "APROBADO",
    label: "Aprobar",
    clase:
      "bg-estado-pazBg text-estado-paz ring-estado-paz/20 hover:bg-estado-paz hover:text-white hover:ring-estado-paz",
    requiereNota: false,
  },
  {
    estado: "NO_APLICA",
    label: "No aplica",
    clase:
      "bg-silver-100 text-silver-600 ring-silver-200 hover:bg-silver-200 hover:text-navy-700",
    requiereNota: false,
  },
  {
    estado: "NO_APROBADO",
    label: "Rechazar",
    clase:
      "bg-red-50 text-estado-rechazo ring-estado-rechazo/20 hover:bg-estado-rechazo hover:text-white hover:ring-estado-rechazo",
    requiereNota: true,
  },
  {
    estado: "PENDIENTE",
    label: "Devolver",
    clase:
      "bg-white text-navy-600 ring-silver-300 hover:bg-silver-50 hover:text-navy-800",
    requiereNota: true,
  },
];

/**
 * Botonera de gestión de una sola área para un funcionario.
 * Aprobar / No aplica son directos; Rechazar / Devolver exigen una observación.
 * Se reutiliza en el detalle del funcionario y en la vista de gestión por área.
 */
export function AccionesArea({
  funcionarioId,
  areaId,
  estado,
}: {
  funcionarioId: string;
  areaId: string;
  estado: EstadoArea;
}) {
  const m = useCambiarEstadoArea()
  const [formEstado, setFormEstado] = useState<EstadoArea | null>(null);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(nuevo: EstadoArea, observacion?: string) {
    setError(null)
    try {
      await m.mutateAsync({ funcionarioId, areaId, estado: nuevo, observacion })
      setFormEstado(null)
      setNota("")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar el cambio. Vuelve a intentarlo.")
    }
  }

  function onAccion(a: Accion) {
    setError(null);
    if (a.requiereNota) setFormEstado(a.estado);
    else void ejecutar(a.estado);
  }

  const pending = m.isPending

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {ACCIONES.filter((a) => a.estado !== estado).map((a) => (
          <button
            key={a.estado}
            type="button"
            disabled={pending}
            onClick={() => onAccion(a)}
            className={`${BTN_BASE} ${a.clase}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {formEstado && (
        <div className="mt-2 rounded-xl border border-silver-200 bg-silver-50 p-3">
          <label className="block text-xs font-medium text-navy-700">
            {formEstado === "NO_APROBADO"
              ? "Motivo del rechazo"
              : "Motivo para devolver a pendiente"}
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Describe el motivo…"
            className="mt-1.5 w-full resize-none rounded-lg border border-silver-300 bg-white p-2.5 text-sm text-navy-800 placeholder:text-silver-600 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
          {error && <p className="mt-1 text-xs text-estado-rechazo">{error}</p>}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={pending || !nota.trim()}
              onClick={() => void ejecutar(formEstado, nota)}
              className={`${BTN_BASE} bg-navy-deep text-white ring-navy-900/20 hover:shadow-luxe`}
            >
              {pending ? "Guardando…" : "Confirmar"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFormEstado(null);
                setNota("");
                setError(null);
              }}
              className={`${BTN_BASE} bg-white text-navy-600 ring-silver-300 hover:bg-silver-100`}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && !formEstado && (
        <p className="mt-2 text-xs text-estado-rechazo">{error}</p>
      )}
    </div>
  );
}
