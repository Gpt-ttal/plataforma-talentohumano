import { useState } from "react"
import { toast } from "sonner"
import type { Experiencia } from "@pys/shared"
import { useCrearExperiencia, useEliminarExperiencia } from "../../../hooks/usePersonal"
import { useGuardaCierre } from "../../../components/ui/Modal"
import {
  BotonAbrir,
  CampoForm,
  FilaEliminable,
  FilaGuardarCancelar,
  inputCls,
  MensajeError,
  mensajeError,
} from "./compartido"

// ── Experiencia laboral (1-N) ─────────────────────────────────────────────────

export function ExperienciaEditor({
  empleadoId,
  experiencia,
}: {
  empleadoId: string
  experiencia: Experiencia[]
}) {
  const crear = useCrearExperiencia()
  const eliminar = useEliminarExperiencia()
  const [abierto, setAbierto] = useState(false)
  const [empresa, setEmpresa] = useState("")
  const [cargo, setCargo] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)
  useGuardaCierre(abierto, "experiencia-editor")

  async function agregar() {
    setError(null)
    if (empresa.trim().length < 2 || cargo.trim().length < 2) {
      setError("Indica la empresa y el cargo.")
      return
    }
    try {
      await crear.mutateAsync({
        id: empleadoId,
        input: {
          empresa: empresa.trim(),
          cargo: cargo.trim(),
          ...(fechaInicio ? { fechaInicio } : {}),
          ...(fechaFin ? { fechaFin } : {}),
          ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        },
      })
      toast.success("Experiencia agregada.")
      setEmpresa("")
      setCargo("")
      setFechaInicio("")
      setFechaFin("")
      setDescripcion("")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar la experiencia."))
    }
  }

  async function confirmarEliminar(id: string) {
    try {
      await eliminar.mutateAsync({ id: empleadoId, experienciaId: id })
      toast.success("Registro de experiencia eliminado.")
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo eliminar el registro."))
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <div>
      {experiencia.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {experiencia.map((x) => (
            <FilaEliminable
              key={x.id}
              pending={eliminar.isPending}
              confirmando={aEliminar === x.id}
              onPedirConfirmar={() => setAEliminar(x.id)}
              onCancelarConfirmar={() => setAEliminar(null)}
              onConfirmar={() => void confirmarEliminar(x.id)}
            >
              {x.cargo} <span className="text-silver-600">· {x.empresa}</span>
            </FilaEliminable>
          ))}
        </ul>
      )}

      {!abierto ? (
        <BotonAbrir onClick={() => setAbierto(true)}>Agregar experiencia</BotonAbrir>
      ) : (
        <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CampoForm label="Empresa">
              <input
                value={empresa}
                maxLength={200}
                onChange={(ev) => setEmpresa(ev.target.value)}
                placeholder="Razón social"
                disabled={crear.isPending}
                aria-invalid={!!error}
                className={inputCls}
              />
            </CampoForm>
            <CampoForm label="Cargo">
              <input
                value={cargo}
                maxLength={160}
                onChange={(ev) => setCargo(ev.target.value)}
                placeholder="p. ej. Analista"
                disabled={crear.isPending}
                aria-invalid={!!error}
                className={inputCls}
              />
            </CampoForm>
            <CampoForm label="Fecha inicio">
              <input
                type="date"
                value={fechaInicio}
                onChange={(ev) => setFechaInicio(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </CampoForm>
            <CampoForm label="Fecha fin (vacío = actual)">
              <input
                type="date"
                value={fechaFin}
                onChange={(ev) => setFechaFin(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </CampoForm>
          </div>
          <CampoForm label="Descripción (opcional)">
            <textarea
              value={descripcion}
              onChange={(ev) => setDescripcion(ev.target.value)}
              placeholder="Funciones y logros"
              rows={2}
              maxLength={1000}
              disabled={crear.isPending}
              className={`${inputCls} w-full resize-none`}
            />
          </CampoForm>
          <FilaGuardarCancelar
            pending={crear.isPending}
            guardandoLabel="Agregando…"
            guardarLabel="Agregar"
            onGuardar={() => void agregar()}
            onCancelar={() => setAbierto(false)}
          />
          <MensajeError>{error}</MensajeError>
        </div>
      )}
    </div>
  )
}
