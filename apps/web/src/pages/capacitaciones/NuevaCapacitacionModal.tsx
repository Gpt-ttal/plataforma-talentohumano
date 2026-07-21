import { useState } from "react"
import { toast } from "sonner"
import { AMBITO_LABEL, ambitoPorDefecto, ambitosVisibles } from "@pys/shared"
import type { AmbitoCapacitacion } from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useCrearCapacitacion } from "../../hooks/useCapacitaciones"
import { useRole } from "../../hooks/useRole"
import { Modal } from "../../components/ui/Modal"
import { TimeField } from "../../components/ui/TimeField"

const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

type Rol = NonNullable<ReturnType<typeof useRole>["rol"]>

/** Fecha de hoy como "YYYY-MM-DD" (zona local) para el valor inicial del campo. */
function fechaHoy(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mes}-${dia}`
}

/** Combina fecha "YYYY-MM-DD" + hora "HH:MM" locales en una ISO 8601 con offset (Z). */
function componerISO(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00`).toISOString()
}

/** Formulario de creación de capacitación, en modal. */
export function NuevaCapacitacionModal({ rol, onClose }: { rol: Rol; onClose: () => void }) {
  const crear = useCrearCapacitacion()
  const ambitoDefault = ambitoPorDefecto(rol)
  const rolesVisibles = ambitosVisibles(rol)

  const [titulo, setTitulo] = useState("")
  const [ambito, setAmbito] = useState<AmbitoCapacitacion>(
    ambitoDefault ?? rolesVisibles[0] ?? "TH",
  )
  const [fecha, setFecha] = useState(fechaHoy)
  const [horaInicio, setHoraInicio] = useState("08:00")
  const [horaFin, setHoraFin] = useState("10:00")
  const [lugar, setLugar] = useState("")
  const [instructor, setInstructor] = useState("")
  const [horas, setHoras] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [error, setError] = useState<string | null>(null)

  const puedeCrear =
    titulo.trim().length >= 3 && Boolean(fecha) && horaFin > horaInicio && !crear.isPending

  async function handleCrear() {
    setError(null)
    if (titulo.trim().length < 3) {
      setError("El título debe tener al menos 3 caracteres.")
      return
    }
    if (!fecha) {
      setError("Selecciona la fecha del evento.")
      return
    }
    if (horaFin <= horaInicio) {
      setError("La hora de fin debe ser posterior a la de inicio.")
      return
    }
    try {
      await crear.mutateAsync({
        titulo: titulo.trim(),
        ambito,
        iniciaEn: componerISO(fecha, horaInicio),
        terminaEn: componerISO(fecha, horaFin),
        lugar: lugar.trim() || undefined,
        instructor: instructor.trim() || undefined,
        horas: horas ? Number(horas) : undefined,
        descripcion: descripcion.trim() || undefined,
      })
      setTitulo("")
      setFecha(fechaHoy())
      setHoraInicio("08:00")
      setHoraFin("10:00")
      setLugar("")
      setInstructor("")
      setHoras("")
      setDescripcion("")
      toast.success("Capacitación creada.")
      onClose()
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo crear la capacitación.",
      )
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Nueva capacitación">
      <div className="space-y-4">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
          Nueva capacitación
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
              placeholder="p. ej. Inducción a la Seguridad Industrial"
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

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Fecha
            </span>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Hora de inicio
            </span>
            <TimeField
              value={horaInicio}
              onChange={setHoraInicio}
              disabled={crear.isPending}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Hora de fin
            </span>
            <TimeField
              value={horaFin}
              onChange={setHoraFin}
              disabled={crear.isPending}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Lugar
            </span>
            <input
              value={lugar}
              maxLength={200}
              onChange={(e) => setLugar(e.target.value)}
              placeholder="p. ej. Aula 201"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Instructor
            </span>
            <input
              value={instructor}
              maxLength={200}
              onChange={(e) => setInstructor(e.target.value)}
              placeholder="Nombre completo"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Horas
            </span>
            <input
              type="number"
              min={0}
              max={999}
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
              placeholder="p. ej. 8"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Descripción
            </span>
            <textarea
              value={descripcion}
              maxLength={1000}
              rows={2}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Resumen o agenda del evento…"
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
            {crear.isPending ? "Creando…" : "Crear capacitación"}
          </button>
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}
