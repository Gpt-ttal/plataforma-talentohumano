import { useState } from "react"
import { toast } from "sonner"
import { AMBITO_LABEL, ambitoPorDefecto, ambitosVisibles } from "@pys/shared"
import type { AmbitoCapacitacion } from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useCrearCurso } from "../../hooks/useCursos"
import { useRole } from "../../hooks/useRole"
import { Modal } from "../../components/ui/Modal"

const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

type Rol = NonNullable<ReturnType<typeof useRole>["rol"]>

/** Formulario de creación de curso, en modal. */
export function NuevoCursoModal({ rol, onClose }: { rol: Rol; onClose: () => void }) {
  const crear = useCrearCurso()
  const ambitoDefault = ambitoPorDefecto(rol)
  const rolesVisibles = ambitosVisibles(rol)

  const [titulo, setTitulo] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [ambito, setAmbito] = useState<AmbitoCapacitacion>(
    ambitoDefault ?? rolesVisibles[0] ?? "TH",
  )
  const [error, setError] = useState<string | null>(null)

  const puedeCrear = titulo.trim().length >= 3 && !crear.isPending

  async function handleCrear() {
    setError(null)
    if (titulo.trim().length < 3) {
      setError("El título debe tener al menos 3 caracteres.")
      return
    }
    try {
      await crear.mutateAsync({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || undefined,
        ambito: rolesVisibles.length > 1 ? ambito : undefined,
      })
      setTitulo("")
      setDescripcion("")
      toast.success("Curso creado en borrador.")
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el curso.")
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Nuevo curso">
      <div className="space-y-4">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
          Nuevo curso
        </span>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Título
            </span>
            <input
              value={titulo}
              maxLength={200}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="p. ej. Inducción SST 2026"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          {rolesVisibles.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
                Ámbito
              </span>
              <select
                value={ambito}
                onChange={(e) => setAmbito(e.target.value as AmbitoCapacitacion)}
                disabled={crear.isPending}
                className={inputCls}
              >
                {rolesVisibles.map((a) => (
                  <option key={a} value={a}>
                    {AMBITO_LABEL[a]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Descripción
            </span>
            <textarea
              value={descripcion}
              maxLength={2000}
              rows={2}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Resumen del curso…"
              disabled={crear.isPending}
              className={`${inputCls} resize-none`}
            />
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={!puedeCrear}
            onClick={() => void handleCrear()}
            className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
          >
            {crear.isPending ? "Creando…" : "Crear curso"}
          </button>
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}
