import { useState } from "react"
import { toast } from "sonner"
import type { Vacante } from "@pys/shared"
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

/**
 * Cierre del proceso (1-1): cédula y fecha de contratación del nuevo empleado.
 * El padre (`VacanteDetalle`) solo monta este editor cuando
 * `estado === "CONTRATADO"` — en cualquier otro estado no aplica todavía.
 */
export function CierreEditor({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const [abierto, setAbierto] = useState(false)
  const [cedula, setCedula] = useState(vacante.cedula ?? "")
  const [fechaContratacion, setFechaContratacion] = useState(vacante.fechaContratacion ?? "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "vacante-cierre")

  async function confirmar() {
    setError(null)
    try {
      await editar.mutateAsync({
        id: vacante.id,
        input: {
          cedula: cedula.trim() || null,
          fechaContratacion: fechaContratacion || null,
        },
      })
      toast.success("Cierre del proceso actualizado.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el cierre del proceso."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar cierre</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Cédula">
          <input
            value={cedula}
            maxLength={20}
            onChange={(ev) => setCedula(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Fecha de contratación">
          <input
            type="date"
            value={fechaContratacion}
            onChange={(ev) => setFechaContratacion(ev.target.value)}
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
