import { useState } from "react"
import { toast } from "sonner"
import { AMBITO_LABEL, ambitosVisibles } from "@pys/shared"
import type { AmbitoCapacitacion } from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useCrearPlaneada } from "../../hooks/usePlanificador"
import { useRole } from "../../hooks/useRole"
import { Modal } from "../../components/ui/Modal"
import { nombreMes } from "./CalendarioPlanificador"

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

type Rol = NonNullable<ReturnType<typeof useRole>["rol"]>

/** Formulario de creación de planeación, en modal. */
export function NuevaPlaneacionModal({ rol, onClose }: { rol: Rol; onClose: () => void }) {
  const crear = useCrearPlaneada()
  const rolesVisibles = ambitosVisibles(rol)
  const mostrarAmbito = rolesVisibles.length > 1

  const anioActual = new Date().getFullYear()
  const mesActual = new Date().getMonth() + 1

  const [titulo, setTitulo] = useState("")
  const [areaObjetivo, setAreaObjetivo] = useState("")
  const [ambito, setAmbito] = useState<AmbitoCapacitacion>(rolesVisibles[0] ?? "TH")
  const [anio, setAnio] = useState(anioActual)
  const [mes, setMes] = useState(mesActual)
  const [notas, setNotas] = useState("")
  const [error, setError] = useState<string | null>(null)

  const puedeCrear = titulo.trim().length >= 3 && !crear.isPending

  const anios = Array.from({ length: 4 }, (_, i) => anioActual - 1 + i)
  const meses = Array.from({ length: 12 }, (_, i) => i + 1)

  async function handleCrear() {
    setError(null)
    if (titulo.trim().length < 3) {
      setError("El título debe tener al menos 3 caracteres.")
      return
    }
    try {
      await crear.mutateAsync({
        titulo: titulo.trim(),
        areaObjetivo: areaObjetivo.trim() || undefined,
        ambito: mostrarAmbito ? ambito : undefined,
        anio,
        mes,
        notas: notas.trim() || undefined,
      })
      toast.success("Planeación creada.")
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear la planeación.")
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="Nueva planeación">
      <div className="space-y-4">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Nueva planeación
        </span>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Título
            </span>
            <input
              value={titulo}
              maxLength={200}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="p. ej. Plan de inducciones 2027"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Área objetivo
            </span>
            <input
              value={areaObjetivo}
              maxLength={200}
              onChange={(e) => setAreaObjetivo(e.target.value)}
              placeholder="p. ej. Todas las sedes / Facultad de…"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          {mostrarAmbito && (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
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
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Año
            </span>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              disabled={crear.isPending}
              className={inputCls}
            >
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Mes
            </span>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              disabled={crear.isPending}
              className={inputCls}
            >
              {meses.map((m) => (
                <option key={m} value={m}>
                  {nombreMes(m)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Notas
            </span>
            <textarea
              value={notas}
              maxLength={2000}
              rows={2}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles, alcance o insumos para cuando se agende…"
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
            {crear.isPending ? "Creando…" : "Crear planeación"}
          </button>
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      </div>
    </Modal>
  )
}
