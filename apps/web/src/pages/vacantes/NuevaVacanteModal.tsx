import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ApiError } from "../../lib/api"
import { useCrearVacante, useSugerenciasVacante, useVacantesCatalogos } from "../../hooks/useVacantes"
import { Modal } from "../../components/ui/Modal"
import { inputCls, labelTextCls } from "../personal/bloques-editables/compartido"

function SugeridoBadge() {
  return (
    <span className="ml-1.5 rounded-full bg-estado-infoBg px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-estado-info">
      Sugerido
    </span>
  )
}

/**
 * Alta de una vacante: solo 3 campos obligatorios (cargo, posiciones, fecha de
 * requerimiento) — el resto se completa progresivamente en el detalle. Al
 * llenar área + cargo, sugiere jefe/dedicación/modalidad (debounce ~300ms) sin
 * bloquear nunca el submit. Éxito navega directo a `/vacantes/:id`.
 */
export function NuevaVacanteModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const crear = useCrearVacante()
  const catalogos = useVacantesCatalogos()

  const [cargo, setCargo] = useState("")
  const [posiciones, setPosiciones] = useState("1")
  const [fechaRequerimiento, setFechaRequerimiento] = useState("")
  const [areaId, setAreaId] = useState("")
  const [jefe, setJefe] = useState("")
  const [jefeSugerido, setJefeSugerido] = useState(false)
  const [dedicacionId, setDedicacionId] = useState("")
  const [dedicacionSugerida, setDedicacionSugerida] = useState(false)
  const [modalidadId, setModalidadId] = useState("")
  const [modalidadSugerida, setModalidadSugerida] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce ~300ms de área+cargo antes de disparar el autocompletar.
  const [criterio, setCriterio] = useState<{ areaId?: string; cargo?: string }>({})
  useEffect(() => {
    const t = setTimeout(() => {
      setCriterio(areaId && cargo.trim() ? { areaId, cargo: cargo.trim() } : {})
    }, 300)
    return () => clearTimeout(t)
  }, [areaId, cargo])

  const habilitadaSugerencia = Boolean(criterio.areaId && criterio.cargo)
  const sugerencias = useSugerenciasVacante(criterio, habilitadaSugerencia)

  useEffect(() => {
    if (!sugerencias.data || !catalogos.data) return
    if (sugerencias.data.jefe && !jefe) {
      setJefe(sugerencias.data.jefe)
      setJefeSugerido(true)
    }
    if (sugerencias.data.dedicacion && !dedicacionId) {
      const item = catalogos.data.dedicaciones.find((d) => d.clave === sugerencias.data!.dedicacion)
      if (item) {
        setDedicacionId(item.id)
        setDedicacionSugerida(true)
      }
    }
    if (sugerencias.data.modalidad && !modalidadId) {
      const item = catalogos.data.modalidades.find((m) => m.clave === sugerencias.data!.modalidad)
      if (item) {
        setModalidadId(item.id)
        setModalidadSugerida(true)
      }
    }
    // Solo reacciona a la llegada de nuevas sugerencias — los campos ya llenos
    // por el usuario no deben sobrescribirse en renders posteriores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugerencias.data, catalogos.data])

  const posicionesNum = Number(posiciones)
  const puedeCrear =
    cargo.trim().length >= 2 &&
    Number.isInteger(posicionesNum) &&
    posicionesNum >= 1 &&
    Boolean(fechaRequerimiento) &&
    !crear.isPending

  async function enviar() {
    setError(null)
    if (cargo.trim().length < 2) {
      setError("El cargo debe tener al menos 2 caracteres.")
      return
    }
    if (!Number.isInteger(posicionesNum) || posicionesNum < 1) {
      setError("N.º de posiciones debe ser un entero ≥ 1.")
      return
    }
    if (!fechaRequerimiento) {
      setError("Selecciona la fecha de requerimiento.")
      return
    }
    try {
      const creada = await crear.mutateAsync({
        cargo: cargo.trim(),
        posiciones: posicionesNum,
        fechaRequerimiento,
        areaId: areaId || undefined,
        jefe: jefe.trim() || undefined,
        dedicacionId: dedicacionId || undefined,
        modalidadId: modalidadId || undefined,
      })
      toast.success("Vacante creada.")
      onClose()
      navigate(`/vacantes/${creada.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear la vacante. Verifica tu conexión.")
    }
  }

  return (
    <Modal onClose={onClose} ariaLabelledby="titulo-nueva-vacante">
      <div className="space-y-4">
        <h2 id="titulo-nueva-vacante" className="font-display text-lg font-semibold text-navy-900 dark:text-foreground">
          Nueva vacante
        </h2>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg bg-estado-rechazoBg px-3 py-2 text-sm text-estado-rechazo"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void enviar()}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelTextCls}>Cargo</span>
            <input
              value={cargo}
              maxLength={200}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="p. ej. Auxiliar Administrativo"
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelTextCls}>N.º de posiciones</span>
            <input
              type="number"
              min={1}
              value={posiciones}
              onChange={(e) => setPosiciones(e.target.value)}
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelTextCls}>Fecha de requerimiento</span>
            <input
              type="date"
              value={fechaRequerimiento}
              onChange={(e) => setFechaRequerimiento(e.target.value)}
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelTextCls}>Área / programa</span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              disabled={crear.isPending}
              className={inputCls}
            >
              <option value="">Sin definir</option>
              {catalogos.data?.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelTextCls}>
              Jefe inmediato
              {jefeSugerido && <SugeridoBadge />}
            </span>
            <input
              value={jefe}
              maxLength={200}
              onChange={(e) => {
                setJefe(e.target.value)
                setJefeSugerido(false)
              }}
              disabled={crear.isPending}
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelTextCls}>
              Dedicación
              {dedicacionSugerida && <SugeridoBadge />}
            </span>
            <select
              value={dedicacionId}
              onChange={(e) => {
                setDedicacionId(e.target.value)
                setDedicacionSugerida(false)
              }}
              disabled={crear.isPending}
              className={inputCls}
            >
              <option value="">Sin definir</option>
              {catalogos.data?.dedicaciones.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className={labelTextCls}>
              Modalidad
              {modalidadSugerida && <SugeridoBadge />}
            </span>
            <select
              value={modalidadId}
              onChange={(e) => {
                setModalidadId(e.target.value)
                setModalidadSugerida(false)
              }}
              disabled={crear.isPending}
              className={inputCls}
            >
              <option value="">Sin definir</option>
              {catalogos.data?.modalidades.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={!puedeCrear}
          onClick={() => void enviar()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
        >
          {crear.isPending && (
            <span
              aria-hidden
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          )}
          {crear.isPending ? "Creando…" : "Crear vacante"}
        </button>
      </div>
    </Modal>
  )
}
