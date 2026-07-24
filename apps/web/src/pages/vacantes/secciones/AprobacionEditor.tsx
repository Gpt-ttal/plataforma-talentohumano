import { useState } from "react"
import { toast } from "sonner"
import { APROBACIONES_PRESUPUESTO_VACANTE, APROBACION_VACANTE_LABEL } from "@pys/shared"
import type { AprobacionPresupuestoVacante, Vacante } from "@pys/shared"
import { useEditarVacante } from "../../../hooks/useVacantes"
import {
  BotonAbrir,
  FilaGuardarCancelar,
  inputCls,
  labelCls,
  labelTextCls,
  mensajeError,
} from "../../personal/bloques-editables/compartido"

/** Aprobación presupuestal (1-1): estado de la aprobación + fecha en que se resolvió. */
export function AprobacionEditor({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const [abierto, setAbierto] = useState(false)
  const [aprobacion, setAprobacion] = useState<AprobacionPresupuestoVacante | "">(vacante.aprobacion ?? "")
  const [fechaAprobacion, setFechaAprobacion] = useState(vacante.fechaAprobacion ?? "")
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setError(null)
    try {
      await editar.mutateAsync({
        id: vacante.id,
        input: {
          aprobacion: aprobacion || null,
          fechaAprobacion: fechaAprobacion || null,
        },
      })
      toast.success("Aprobación presupuestal actualizada.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la aprobación."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar aprobación</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={aprobacion}
          onChange={(ev) => setAprobacion(ev.target.value as AprobacionPresupuestoVacante | "")}
          disabled={editar.isPending}
          className={inputCls}
        >
          <option value="">Aprobación (sin especificar)</option>
          {APROBACIONES_PRESUPUESTO_VACANTE.map((a) => (
            <option key={a} value={a}>
              {APROBACION_VACANTE_LABEL[a]}
            </option>
          ))}
        </select>
        <label className={labelCls}>
          <span className={labelTextCls}>Fecha de aprobación</span>
          <input
            type="date"
            value={fechaAprobacion}
            onChange={(ev) => setFechaAprobacion(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </label>
      </div>
      <FilaGuardarCancelar
        pending={editar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}
