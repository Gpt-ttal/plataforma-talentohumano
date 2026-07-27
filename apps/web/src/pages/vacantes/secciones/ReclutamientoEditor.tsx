import { useState } from "react"
import { toast } from "sonner"
import type { CatalogoVacanteItem, Vacante } from "@pys/shared"
import { useEditarVacante, useVacantesCatalogos } from "../../../hooks/useVacantes"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "../../personal/bloques-editables/compartido"

function idPorClave(catalogo: CatalogoVacanteItem[], clave: string | null): string {
  if (!clave) return ""
  return catalogo.find((c) => c.clave === clave)?.id ?? ""
}

/** Condiciones del cargo (1-1): modalidad, dedicación, escalafón, fuente de reclutamiento, salario. */
export function ReclutamientoEditor({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const catalogos = useVacantesCatalogos()
  const [abierto, setAbierto] = useState(false)
  const [modalidadId, setModalidadId] = useState(idPorClave(catalogos.data?.modalidades ?? [], vacante.modalidad))
  const [dedicacionId, setDedicacionId] = useState(idPorClave(catalogos.data?.dedicaciones ?? [], vacante.dedicacion))
  const [escalafonId, setEscalafonId] = useState(idPorClave(catalogos.data?.escalafones ?? [], vacante.escalafon))
  const [fuenteId, setFuenteId] = useState(idPorClave(catalogos.data?.fuentes ?? [], vacante.fuente))
  const [salario, setSalario] = useState(vacante.salario !== null ? String(vacante.salario) : "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "vacante-reclutamiento")

  async function confirmar() {
    setError(null)
    try {
      await editar.mutateAsync({
        id: vacante.id,
        input: {
          modalidadId: modalidadId || null,
          dedicacionId: dedicacionId || null,
          escalafonId: escalafonId || null,
          fuenteId: fuenteId || null,
          salario: salario.trim() ? Number(salario) : null,
        },
      })
      toast.success("Reclutamiento actualizado.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar el bloque de reclutamiento."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar reclutamiento</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Modalidad">
          <select
            value={modalidadId}
            onChange={(ev) => setModalidadId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {(catalogos.data?.modalidades ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Dedicación">
          <select
            value={dedicacionId}
            onChange={(ev) => setDedicacionId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {(catalogos.data?.dedicaciones ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Escalafón">
          <select
            value={escalafonId}
            onChange={(ev) => setEscalafonId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {(catalogos.data?.escalafones ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Fuente de reclutamiento">
          <select
            value={fuenteId}
            onChange={(ev) => setFuenteId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {(catalogos.data?.fuentes ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Salario">
          <input
            type="number"
            min={0}
            value={salario}
            onChange={(ev) => setSalario(ev.target.value)}
            placeholder="p. ej. 2500000"
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
