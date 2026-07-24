import { useState } from "react"
import { toast } from "sonner"
import {
  ESTADO_VACANTE_LABEL,
  ESTADOS_VACANTE,
  evaluarFila,
  FASES_VACANTE,
  indiceFaseVacante,
  tieneBloqueoVacante,
} from "@pys/shared"
import type { EstadoVacante, FaseVacante, Vacante, VacanteEvaluable } from "@pys/shared"
import { useEditarVacante } from "../../hooks/useVacantes"
import { inputCls, mensajeError } from "../personal/bloques-editables/compartido"
import { FaseVacanteStepper } from "./FaseVacanteStepper"

/**
 * Acciones de gestión de la vacante: avance de fase (stepper secuencial, con
 * espejo cliente de `evaluarFila` antes de tocar el servidor — §3.2 del spec
 * de diseño) y cambio del estado capturado del ciclo de vida (§AccionesVacante
 * del árbol de archivos). Ambas usan la misma mutación PATCH parcial.
 */
export function AccionesVacante({ vacante }: { vacante: Vacante }) {
  return (
    <div className="space-y-6">
      <AvanceFase vacante={vacante} />
      <div className="border-t border-hairline pt-4">
        <MarcarEstado vacante={vacante} />
      </div>
    </div>
  )
}

// ── Avance de fase (stepper secuencial) ─────────────────────────────────────

function AvanceFase({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const [error, setError] = useState<string | null>(null)

  const indice = indiceFaseVacante(vacante.fase)

  async function mover(nuevaFase: FaseVacante, validarCliente: boolean) {
    setError(null)
    if (validarCliente) {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...resto } = vacante
      const draft: VacanteEvaluable = { ...resto, fase: nuevaFase }
      const hallazgos = evaluarFila(draft, new Date().toISOString().slice(0, 10))
      if (tieneBloqueoVacante(hallazgos)) {
        setError(
          hallazgos
            .filter((h) => h.severidad === "BLOQUEO")
            .map((h) => h.mensaje)
            .join(" "),
        )
        return
      }
    }
    try {
      await editar.mutateAsync({ id: vacante.id, input: { fase: nuevaFase } })
    } catch (e) {
      setError(mensajeError(e, "No se pudo avanzar la fase."))
    }
  }

  function avanzar() {
    const siguiente = FASES_VACANTE[indice + 1]
    if (siguiente) void mover(siguiente, true)
  }

  function retroceder() {
    const anterior = FASES_VACANTE[indice - 1]
    if (anterior) void mover(anterior, false)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Avance del proceso</h3>
      <FaseVacanteStepper
        faseActual={vacante.fase}
        onAvanzar={avanzar}
        onRetroceder={retroceder}
        cargando={editar.isPending}
      />
      {error && <p className="rounded-lg bg-estado-rechazoBg px-3 py-2 text-sm text-estado-rechazo">{error}</p>}
    </div>
  )
}

// ── Marcar estado (ciclo de vida capturado) ─────────────────────────────────

function MarcarEstado({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const [nuevoEstado, setNuevoEstado] = useState<EstadoVacante>(vacante.estado)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setError(null)
    try {
      await editar.mutateAsync({ id: vacante.id, input: { estado: nuevoEstado } })
      toast.success("Estado actualizado.")
      setConfirmando(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo actualizar el estado."))
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Estado del proceso</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={nuevoEstado}
          onChange={(ev) => {
            setNuevoEstado(ev.target.value as EstadoVacante)
            setConfirmando(false)
          }}
          disabled={editar.isPending}
          className={inputCls}
        >
          {ESTADOS_VACANTE.map((e) => (
            <option key={e} value={e}>
              {ESTADO_VACANTE_LABEL[e]}
            </option>
          ))}
        </select>
        {nuevoEstado !== vacante.estado && !confirmando && (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="rounded-lg border border-gold-300 bg-gold-50 px-3 py-2 text-sm font-semibold text-gold-700"
          >
            Marcar como {ESTADO_VACANTE_LABEL[nuevoEstado]}
          </button>
        )}
      </div>
      {confirmando && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold-300 bg-gold-50/60 px-3 py-2">
          <span className="text-sm font-medium text-gold-800">
            ¿Confirmar el cambio a «{ESTADO_VACANTE_LABEL[nuevoEstado]}»?
          </span>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={editar.isPending}
            className="rounded-md bg-navy-deep px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {editar.isPending ? "Guardando…" : "Sí, confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            disabled={editar.isPending}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-silver-600"
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}
