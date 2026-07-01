import { useState } from "react"
import { Outlet, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  AMBITO_LABEL,
  ambitoPorDefecto,
  ambitosVisibles,
  ESTADO_REGISTRO_BADGE,
  ESTADO_REGISTRO_DOT,
  ESTADO_REGISTRO_LABEL,
  formatFecha,
  POR_PAGINA_DEFECTO,
} from "@pys/shared"
import type { AmbitoCapacitacion, Capacitacion, EstadoRegistro } from "@pys/shared"
import { apiCapacitaciones, ApiError } from "../../lib/api"
import { useCapacitaciones, useCrearCapacitacion } from "../../hooks/useCapacitaciones"
import { useRole } from "../../hooks/useRole"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Buscador } from "../../components/ui/Buscador"
import { Paginacion } from "../../components/ui/Paginacion"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { Icon } from "../../components/ui/dash/Icon"
import { TimeField } from "../../components/ui/TimeField"
import { GestionCapacitacion } from "./GestionCapacitacion"

const BASE = "/capacitaciones"

const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Módulo de Capacitaciones — listado + gestión (TH · SST · SA). Filtra por rol
 * en el backend (TH → TH, SST → SST, SA → ambos). La ruta hija `:id` abre el
 * modal de detalle con el QR.
 */
export function CapacitacionesPage() {
  const { rol } = useRole()
  const [searchParams] = useSearchParams()

  const q = searchParams.get("q") ?? undefined
  const estado = (searchParams.get("estado") as EstadoRegistro | null) ?? undefined
  const ambito = (searchParams.get("ambito") as AmbitoCapacitacion | null) ?? undefined
  const pagina = searchParams.get("pagina") ? Number(searchParams.get("pagina")) : undefined

  const { data, isLoading, isError } = useCapacitaciones({
    q,
    estado,
    ambito,
    pagina,
    porPagina: POR_PAGINA_DEFECTO,
  })

  const rolesVisibles = rol ? ambitosVisibles(rol) : []
  const mostrarFiltroAmbito = rolesVisibles.length > 1

  return (
    <div className="space-y-7">
      <PageHeader
        title="Capacitaciones"
        description="Registra eventos de formación, gestiona la asistencia con QR y exporta la evidencia en CSV. Cada área gestiona sus propias capacitaciones."
        meta={
          <>
            <span>Gestión Humana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">Formación y desarrollo</HeaderMetaDot>
          </>
        }
      />

      {/* Formulario de creación */}
      {rol && <FormularioCrear rol={rol} />}

      {/* Filtros */}
      <div className="premium-card flex flex-wrap items-end gap-3 rounded-xl px-4 py-4">
        <div className="flex-1">
          <Buscador placeholder="Buscar por título o instructor…" />
        </div>

        {mostrarFiltroAmbito && (
          <FiltroAmbito ambito={ambito} ambitos={rolesVisibles} />
        )}

        <FiltroEstado estado={estado} />
      </div>

      {isLoading ? (
        <ListaSkeleton filas={3} />
      ) : isError ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudieron cargar las capacitaciones"
          mensaje="Hubo un problema al consultar los eventos. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          ilustracion={<SpotSinResultados />}
          titulo="Sin capacitaciones"
          mensaje="No hay eventos que coincidan con la búsqueda o los filtros. Crea uno arriba."
        />
      ) : (
        <div className="space-y-7">
          <div className="space-y-2.5">
            {data.items.map((c) => (
              <FilaCapacitacion key={c.id} capacitacion={c} />
            ))}
          </div>
          <Paginacion
            basePath={BASE}
            params={{ q, estado, ambito }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}

      {/* Modal de detalle / QR (ruta hija `:id`) */}
      <Outlet />
    </div>
  )
}

// ── Formulario de creación ─────────────────────────────────────────────────

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

function FormularioCrear({ rol }: { rol: Rol }) {
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
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo crear la capacitación.",
      )
    }
  }

  return (
    <div className="premium-card space-y-4 rounded-xl px-4 py-4">
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
  )
}

// ── Filtros server-driven ──────────────────────────────────────────────────

function FiltroEstado({ estado }: { estado: EstadoRegistro | undefined }) {
  const [, setSearchParams] = useSearchParams()

  const estados: Array<EstadoRegistro | "todos"> = ["todos", "BORRADOR", "ABIERTO", "CERRADO"]

  function cambiar(val: EstadoRegistro | "todos") {
    setSearchParams(
      (sp) => {
        const next = new URLSearchParams(sp)
        if (val === "todos") next.delete("estado")
        else next.set("estado", val)
        next.delete("pagina")
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {estados.map((e) => {
        const activo = e === "todos" ? !estado : estado === e
        return (
          <button
            key={e}
            type="button"
            onClick={() => cambiar(e as EstadoRegistro | "todos")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activo
                ? "bg-navy-deep text-white shadow-luxe"
                : "bg-silver-100 text-silver-600 hover:bg-silver-200"
            }`}
          >
            {e === "todos" ? "Todos" : ESTADO_REGISTRO_LABEL[e as EstadoRegistro]}
          </button>
        )
      })}
    </div>
  )
}

function FiltroAmbito({
  ambito,
  ambitos,
}: {
  ambito: AmbitoCapacitacion | undefined
  ambitos: AmbitoCapacitacion[]
}) {
  const [, setSearchParams] = useSearchParams()

  function cambiar(val: AmbitoCapacitacion | "todos") {
    setSearchParams(
      (sp) => {
        const next = new URLSearchParams(sp)
        if (val === "todos") next.delete("ambito")
        else next.set("ambito", val)
        next.delete("pagina")
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => cambiar("todos")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          !ambito
            ? "bg-navy-deep text-white shadow-luxe"
            : "bg-silver-100 text-silver-600 hover:bg-silver-200"
        }`}
      >
        Todos
      </button>
      {ambitos.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => cambiar(a)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            ambito === a
              ? "bg-navy-deep text-white shadow-luxe"
              : "bg-silver-100 text-silver-600 hover:bg-silver-200"
          }`}
        >
          {AMBITO_LABEL[a]}
        </button>
      ))}
    </div>
  )
}

// ── Fila de capacitación ───────────────────────────────────────────────────

function FilaCapacitacion({ capacitacion: c }: { capacitacion: Capacitacion }) {
  const { className: pillCls, dot, label } = {
    className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_REGISTRO_BADGE[c.estadoRegistro]}`,
    dot: ESTADO_REGISTRO_DOT[c.estadoRegistro],
    label: ESTADO_REGISTRO_LABEL[c.estadoRegistro],
  }

  return (
    <FilaDesplegable
      cabecera={
        <span className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50 font-mono text-[10px] font-bold text-navy-600 ring-1 ring-navy-200">
            {AMBITO_LABEL[c.ambito].split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-navy-900">{c.titulo}</span>
            <span className="block text-xs text-silver-600">
              {formatFecha(c.iniciaEn)}
              {c.instructor ? ` · ${c.instructor}` : ""}
              {c.lugar ? ` · ${c.lugar}` : ""}
            </span>
          </span>
          <span className={pillCls}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {label}
          </span>
        </span>
      }
    >
      <GestionCapacitacion capacitacion={c} />
    </FilaDesplegable>
  )
}

