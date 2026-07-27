import { useState } from "react"
import { toast } from "sonner"
import { APROBACIONES_PRESUPUESTO_VACANTE, APROBACION_VACANTE_LABEL } from "@pys/shared"
import type { AprobacionPresupuestoVacante, Vacante } from "@pys/shared"
import { useEditarVacante } from "../../../hooks/useVacantes"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "../../personal/bloques-editables/compartido"

/** Aprobación presupuestal (1-1): estado de la aprobación + fecha en que se resolvió. */
export function AprobacionEditor({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const [abierto, setAbierto] = useState(false)
  const [aprobacion, setAprobacion] = useState<AprobacionPresupuestoVacante | "">(vacante.aprobacion ?? "")
  const [fechaAprobacion, setFechaAprobacion] = useState(vacante.fechaAprobacion ?? "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "vacante-aprobacion")

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
        <CampoForm label="Aprobación">
          <select
            value={aprobacion}
            onChange={(ev) => setAprobacion(ev.target.value as AprobacionPresupuestoVacante | "")}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {APROBACIONES_PRESUPUESTO_VACANTE.map((a) => (
              <option key={a} value={a}>
                {APROBACION_VACANTE_LABEL[a]}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Fecha de aprobación">
          <input
            type="date"
            value={fechaAprobacion}
            onChange={(ev) => setFechaAprobacion(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
      </div>
      <FilaGuardarCancelar
        pending={editar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      <MensajeError>{error}</MensajeError>
    </div>
  )
}
