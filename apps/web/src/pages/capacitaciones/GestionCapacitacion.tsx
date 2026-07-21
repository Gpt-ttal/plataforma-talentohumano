import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import {
  AMBITO_LABEL,
  formatFecha,
  formatFechaHora,
  puedeGestionarAmbito,
  registroAbierto,
} from "@pys/shared"
import type { Capacitacion } from "@pys/shared"
import { apiCapacitaciones, ApiError } from "../../lib/api"
import { useAbrirRegistro, useCerrarRegistro } from "../../hooks/useCapacitaciones"
import { useRole } from "../../hooks/useRole"

/**
 * Cuerpo desplegado de una fila de capacitación: metadatos + acciones de
 * transición (Abrir / Cerrar registro) + enlace al detalle con QR. El backend
 * es la fuente de autorización real; aquí solo se ocultan acciones irrelevantes.
 */
export function GestionCapacitacion({ capacitacion: c }: { capacitacion: Capacitacion }) {
  const { rol } = useRole()
  const puedGestionar = rol ? puedeGestionarAmbito(rol, c.ambito) : false
  const abrir = useAbrirRegistro()
  const cerrar = useCerrarRegistro()

  async function handleAbrir() {
    try {
      await abrir.mutateAsync(c.id)
      toast.success("Registro de asistencia abierto.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo abrir el registro.")
    }
  }

  async function handleCerrar() {
    try {
      await cerrar.mutateAsync(c.id)
      toast.success("Registro de asistencia cerrado.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo cerrar el registro.")
    }
  }

  const esBorrador = c.estadoRegistro === "BORRADOR"
  const estaAbierto = registroAbierto(c.estadoRegistro)
  const pendiente = abrir.isPending || cerrar.isPending

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
        <Dato etiqueta="Ámbito" valor={AMBITO_LABEL[c.ambito]} />
        <Dato etiqueta="Inicio" valor={formatFechaHora(c.iniciaEn)} />
        <Dato etiqueta="Fin" valor={formatFechaHora(c.terminaEn)} />
        {c.lugar && <Dato etiqueta="Lugar" valor={c.lugar} />}
        {c.instructor && <Dato etiqueta="Instructor" valor={c.instructor} />}
        {c.horas && <Dato etiqueta="Horas" valor={String(c.horas)} />}
        <Dato etiqueta="Creada" valor={formatFecha(c.createdAt)} />
      </dl>

      {c.descripcion && (
        <p className="text-sm text-silver-600">{c.descripcion}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* Enlace al detalle + QR */}
        <Link
          to={c.id}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-gold-600"
        >
          Ver detalle y QR <span aria-hidden>→</span>
        </Link>

        {/* Acciones de transición (solo si puede gestionar este ámbito) */}
        {puedGestionar && esBorrador && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => void handleAbrir()}
            className="rounded-lg bg-estado-okBg px-3 py-1.5 text-xs font-semibold text-estado-ok ring-1 ring-estado-ok/30 transition hover:bg-estado-ok hover:text-white disabled:opacity-50"
          >
            {abrir.isPending ? "Abriendo…" : "Abrir registro"}
          </button>
        )}

        {puedGestionar && estaAbierto && (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => void handleCerrar()}
            className="rounded-lg bg-estado-infoBg px-3 py-1.5 text-xs font-semibold text-estado-info ring-1 ring-estado-info/30 transition hover:bg-estado-info hover:text-white disabled:opacity-50"
          >
            {cerrar.isPending ? "Cerrando…" : "Cerrar registro"}
          </button>
        )}

        {/* Exportar asistencias (cuando ya hay algo que exportar) */}
        {puedGestionar && c.estadoRegistro !== "BORRADOR" && (
          <ExportarButton id={c.id} titulo={c.titulo} />
        )}
      </div>
    </div>
  )
}

function ExportarButton({ id, titulo }: { id: string; titulo: string }) {
  const [descargando, setDescargando] = useState(false)

  async function exportar() {
    setDescargando(true)
    try {
      const blob = await apiCapacitaciones.exportarAsistencias(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `asistencias-${titulo.slice(0, 40).replace(/\s+/g, "-")}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo exportar.")
    } finally {
      setDescargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void exportar()}
      disabled={descargando}
      className="inline-flex items-center gap-1.5 rounded-lg border border-silver-200 bg-white/85 px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-luxe transition hover:border-gold-300 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden>↓</span> {descargando ? "Exportando…" : "Exportar asistencias"}
    </button>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-silver-600">{etiqueta}</dt>
      <dd className="mt-0.5 truncate font-medium text-navy-700">{valor}</dd>
    </div>
  )
}
