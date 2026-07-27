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

/** Datos generales de la solicitud (1-1): cargo, posiciones, área, jefe, reemplazo, motivo. */
export function SolicitudEditor({ vacante }: { vacante: Vacante }) {
  const editar = useEditarVacante()
  const catalogos = useVacantesCatalogos()
  const [abierto, setAbierto] = useState(false)
  const [cargo, setCargo] = useState(vacante.cargo)
  const [posiciones, setPosiciones] = useState(String(vacante.posiciones))
  const [areaId, setAreaId] = useState(vacante.areaId ?? "")
  const [jefe, setJefe] = useState(vacante.jefe ?? "")
  const [reemplazo, setReemplazo] = useState(vacante.reemplazo ?? "")
  const [nombreNuevo, setNombreNuevo] = useState(vacante.nombreNuevo ?? "")
  const [motivoId, setMotivoId] = useState(idPorClave(catalogos.data?.motivos ?? [], vacante.motivo))
  const [fechaRequerimiento, setFechaRequerimiento] = useState(vacante.fechaRequerimiento)
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "vacante-solicitud")

  async function confirmar() {
    setError(null)
    const posicionesNum = Number(posiciones)
    if (!Number.isInteger(posicionesNum) || posicionesNum < 1) {
      setError("N.º de posiciones debe ser un entero ≥ 1.")
      return
    }
    try {
      await editar.mutateAsync({
        id: vacante.id,
        input: {
          cargo: cargo.trim(),
          posiciones: posicionesNum,
          areaId: areaId || null,
          jefe: jefe.trim() || null,
          reemplazo: reemplazo.trim() || null,
          nombreNuevo: nombreNuevo.trim() || null,
          motivoId: motivoId || null,
          fechaRequerimiento,
        },
      })
      toast.success("Solicitud actualizada.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la solicitud."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar solicitud</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Cargo">
          <input
            value={cargo}
            maxLength={200}
            onChange={(ev) => setCargo(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="N.º de posiciones">
          <input
            type="number"
            min={1}
            value={posiciones}
            onChange={(ev) => setPosiciones(ev.target.value)}
            disabled={editar.isPending}
            aria-invalid={!!error}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Área / programa">
          <select
            value={areaId}
            onChange={(ev) => setAreaId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin asignar</option>
            {(catalogos.data?.areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Motivo">
          <select
            value={motivoId}
            onChange={(ev) => setMotivoId(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          >
            <option value="">Sin especificar</option>
            {(catalogos.data?.motivos ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Jefe inmediato">
          <input
            value={jefe}
            maxLength={200}
            onChange={(ev) => setJefe(ev.target.value)}
            placeholder="Nombre del jefe"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Reemplazo de (si aplica)">
          <input
            value={reemplazo}
            maxLength={200}
            onChange={(ev) => setReemplazo(ev.target.value)}
            placeholder="Nombre de la persona reemplazada"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Candidato / nuevo empleado">
          <input
            value={nombreNuevo}
            maxLength={200}
            onChange={(ev) => setNombreNuevo(ev.target.value)}
            placeholder="Nombre del candidato"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Fecha de requerimiento">
          <input
            type="date"
            value={fechaRequerimiento}
            onChange={(ev) => setFechaRequerimiento(ev.target.value)}
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
