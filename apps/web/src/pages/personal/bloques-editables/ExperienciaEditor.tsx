import { useState } from "react"
import { toast } from "sonner"
import type { Experiencia } from "@pys/shared"
import { useCrearExperiencia, useEliminarExperiencia } from "../../../hooks/usePersonal"
import { BotonAbrir, FilaEliminable, FilaGuardarCancelar, inputCls, labelCls, labelTextCls, mensajeError } from "./compartido"

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
            <input
              value={empresa}
              maxLength={200}
              onChange={(ev) => setEmpresa(ev.target.value)}
              placeholder="Empresa"
              disabled={crear.isPending}
              className={inputCls}
            />
            <input
              value={cargo}
              maxLength={160}
              onChange={(ev) => setCargo(ev.target.value)}
              placeholder="Cargo"
              disabled={crear.isPending}
              className={inputCls}
            />
            <label className={labelCls}>
              <span className={labelTextCls}>Fecha inicio</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(ev) => setFechaInicio(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              <span className={labelTextCls}>Fecha fin (vacío = actual)</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(ev) => setFechaFin(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </label>
          </div>
          <textarea
            value={descripcion}
            onChange={(ev) => setDescripcion(ev.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            maxLength={1000}
            disabled={crear.isPending}
            className={`${inputCls} w-full resize-none`}
          />
          <FilaGuardarCancelar
            pending={crear.isPending}
            guardandoLabel="Agregando…"
            guardarLabel="Agregar"
            onGuardar={() => void agregar()}
            onCancelar={() => setAbierto(false)}
          />
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      )}
    </div>
  )
}
