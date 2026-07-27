import { useState } from "react"
import { toast } from "sonner"
import { NIVELES_FORMACION, NIVEL_FORMACION_LABEL } from "@pys/shared"
import type { Formacion, NivelFormacion } from "@pys/shared"
import { useCrearFormacion, useEliminarFormacion } from "../../../hooks/usePersonal"
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

// ── Formación académica (1-N) ─────────────────────────────────────────────────

export function FormacionEditor({
  empleadoId,
  formacion,
}: {
  empleadoId: string
  formacion: Formacion[]
}) {
  const crear = useCrearFormacion()
  const eliminar = useEliminarFormacion()
  const [abierto, setAbierto] = useState(false)
  const [nivel, setNivel] = useState<NivelFormacion>("PROFESIONAL")
  const [titulo, setTitulo] = useState("")
  const [institucion, setInstitucion] = useState("")
  const [anioInicio, setAnioInicio] = useState("")
  const [anioFin, setAnioFin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)
  useGuardaCierre(abierto, "formacion-editor")

  async function agregar() {
    setError(null)
    if (titulo.trim().length < 2) {
      setError("Indica el título obtenido.")
      return
    }
    try {
      await crear.mutateAsync({
        id: empleadoId,
        input: {
          nivel,
          titulo: titulo.trim(),
          ...(institucion.trim() ? { institucion: institucion.trim() } : {}),
          ...(anioInicio ? { anioInicio: Number(anioInicio) } : {}),
          ...(anioFin ? { anioFin: Number(anioFin) } : {}),
        },
      })
      toast.success("Formación agregada.")
      setTitulo("")
      setInstitucion("")
      setAnioInicio("")
      setAnioFin("")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar la formación."))
    }
  }

  async function confirmarEliminar(id: string) {
    try {
      await eliminar.mutateAsync({ id: empleadoId, formacionId: id })
      toast.success("Registro de formación eliminado.")
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo eliminar el registro."))
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <div>
      {formacion.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {formacion.map((f) => (
            <FilaEliminable
              key={f.id}
              pending={eliminar.isPending}
              confirmando={aEliminar === f.id}
              onPedirConfirmar={() => setAEliminar(f.id)}
              onCancelarConfirmar={() => setAEliminar(null)}
              onConfirmar={() => void confirmarEliminar(f.id)}
            >
              {f.titulo} <span className="text-silver-600">· {NIVEL_FORMACION_LABEL[f.nivel]}</span>
            </FilaEliminable>
          ))}
        </ul>
      )}

      {!abierto ? (
        <BotonAbrir onClick={() => setAbierto(true)}>Agregar formación</BotonAbrir>
      ) : (
        <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CampoForm label="Nivel">
              <select
                value={nivel}
                onChange={(ev) => setNivel(ev.target.value as NivelFormacion)}
                disabled={crear.isPending}
                className={inputCls}
              >
                {NIVELES_FORMACION.map((n) => (
                  <option key={n} value={n}>
                    {NIVEL_FORMACION_LABEL[n]}
                  </option>
                ))}
              </select>
            </CampoForm>
            <CampoForm label="Título obtenido">
              <input
                value={titulo}
                maxLength={200}
                onChange={(ev) => setTitulo(ev.target.value)}
                placeholder="p. ej. Ingeniería de Sistemas"
                disabled={crear.isPending}
                aria-invalid={!!error}
                className={inputCls}
              />
            </CampoForm>
            <CampoForm label="Institución (opcional)">
              <input
                value={institucion}
                maxLength={200}
                onChange={(ev) => setInstitucion(ev.target.value)}
                placeholder="Universidad o instituto"
                disabled={crear.isPending}
                className={inputCls}
              />
            </CampoForm>
            <div className="flex gap-2">
              <CampoForm label="Año inicio">
                <input
                  type="number"
                  value={anioInicio}
                  min={1900}
                  max={2100}
                  onChange={(ev) => setAnioInicio(ev.target.value)}
                  placeholder="2015"
                  disabled={crear.isPending}
                  className={inputCls}
                />
              </CampoForm>
              <CampoForm label="Año fin">
                <input
                  type="number"
                  value={anioFin}
                  min={1900}
                  max={2100}
                  onChange={(ev) => setAnioFin(ev.target.value)}
                  placeholder="2020"
                  disabled={crear.isPending}
                  className={inputCls}
                />
              </CampoForm>
            </div>
          </div>
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
