import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  AMBITO_LABEL,
  ambitosVisibles,
  ESTADO_CAP_PLANEADA_LABEL,
  ESTADOS_CAPACITACION_PLANEADA,
  estadoCapacitacionPlaneadaPill,
  hrefCon,
  POR_PAGINA_DEFECTO,
  trimestreDe,
} from "@pys/shared"
import type {
  AmbitoCapacitacion,
  CapacitacionPlaneada,
  EstadoCapacitacionPlaneada,
} from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useEditarPlaneada, useEliminarPlaneada, usePlanificador } from "../../hooks/usePlanificador"
import { useRole } from "../../hooks/useRole"
import { Buscador } from "../../components/ui/Buscador"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Paginacion } from "../../components/ui/Paginacion"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { Segmented } from "../../components/ui/Segmented"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { Icon } from "../../components/ui/dash/Icon"
import { CalendarioPlanificador, nombreMes } from "./CalendarioPlanificador"
import { NuevaPlaneacionModal } from "./NuevaPlaneacionModal"

const BASE = "/planificador"

type Vista = "lista" | "calendario"

/**
 * Planificador: agenda anual de capacitaciones planeadas (título, área objetivo
 * libre, mes/año, estado, notas). Vista lista (CRUD) + vista calendario ("año
 * de un vistazo", 12 celdas de mes). Server-driven por searchParams, sin ruta
 * todavía (se cablea en la Fase 9).
 */
export function PlanificadorPage() {
  const { rol } = useRole()
  const [searchParams] = useSearchParams()
  const [crearAbierto, setCrearAbierto] = useState(false)

  const vista: Vista = searchParams.get("vista") === "calendario" ? "calendario" : "lista"
  const q = searchParams.get("q") ?? undefined
  const estado =
    (searchParams.get("estado") as EstadoCapacitacionPlaneada | null) ?? undefined
  const ambito = (searchParams.get("ambito") as AmbitoCapacitacion | null) ?? undefined
  const anioActual = new Date().getFullYear()
  const anioNum = searchParams.get("anio") ? Number(searchParams.get("anio")) : anioActual
  const mesNum = searchParams.get("mes") ? Number(searchParams.get("mes")) : undefined
  const pagina = searchParams.get("pagina") ? Number(searchParams.get("pagina")) : undefined

  const { data, isLoading, isError } = usePlanificador({
    q,
    estado,
    ambito,
    anio: anioNum,
    mes: mesNum,
    pagina,
    porPagina: POR_PAGINA_DEFECTO,
  })

  const rolesVisibles = rol ? ambitosVisibles(rol) : []
  const mostrarFiltroAmbito = rolesVisibles.length > 1

  const paramsListaBase = { q, estado, ambito, anio: anioNum, mes: mesNum }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Planificador"
        description="Plan institucional de capacitaciones por mes y año: agenda lo que viene, antes de que exista como evento con QR."
        meta={
          <>
            <span>Gestión Humana</span>
            <span className="hidden text-faint sm:inline">/</span>
            <HeaderMetaDot tone="gold">Agenda anual</HeaderMetaDot>
          </>
        }
        actions={
          rol && (
            <button
              type="button"
              onClick={() => setCrearAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold-400"
            >
              <Icon name="plus" className="h-4 w-4" />
              Nueva planeación
            </button>
          )
        }
      />

      {crearAbierto && rol && (
        <NuevaPlaneacionModal rol={rol} onClose={() => setCrearAbierto(false)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          etiqueta="Vista del planificador"
          activo={vista}
          opciones={[
            {
              value: "lista",
              label: "Lista",
              href: hrefCon(BASE, { ...paramsListaBase, pagina }),
            },
            {
              value: "calendario",
              label: "Calendario",
              href: hrefCon(BASE, { anio: anioNum, vista: "calendario" }),
            },
          ]}
        />
      </div>

      {vista === "calendario" ? (
        <CalendarioPlanificador anio={anioNum} />
      ) : (
        <>
          <div className="premium-card flex flex-wrap items-end gap-3 rounded-xl px-4 py-4">
            <div className="flex-1">
              <Buscador placeholder="Buscar por título…" />
            </div>
            {mostrarFiltroAmbito && (
              <FiltroAmbito ambito={ambito} ambitos={rolesVisibles} />
            )}
            <FiltroEstado estado={estado} />
          </div>

          {mesNum && (
            <div>
              <ChipMes mes={mesNum} />
            </div>
          )}

          {isLoading ? (
            <ListaSkeleton filas={3} />
          ) : isError ? (
            <EmptyState
              icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
              titulo="No se pudo cargar el planificador"
              mensaje="Hubo un problema al consultar la agenda. Revisa tu conexión e inténtalo de nuevo."
            />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              ilustracion={<SpotSinResultados />}
              titulo="Sin planeaciones"
              mensaje="No hay ítems que coincidan con la búsqueda o los filtros. Crea uno arriba."
            />
          ) : (
            <div className="space-y-7">
              <div className="space-y-2.5">
                {data.items.map((p) => (
                  <FilaPlaneada key={p.id} item={p} />
                ))}
              </div>
              <Paginacion
                basePath={BASE}
                params={paramsListaBase}
                pagina={data.pagina}
                totalPaginas={data.totalPaginas}
                total={data.total}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Filtros server-driven ──────────────────────────────────────────────────

function FiltroEstado({ estado }: { estado: EstadoCapacitacionPlaneada | undefined }) {
  const [, setSearchParams] = useSearchParams()

  const estados: Array<EstadoCapacitacionPlaneada | "todos"> = [
    "todos",
    ...ESTADOS_CAPACITACION_PLANEADA,
  ]

  function cambiar(val: EstadoCapacitacionPlaneada | "todos") {
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
            onClick={() => cambiar(e)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activo
                ? "bg-navy-deep text-white shadow-luxe"
                : "bg-surface-2 text-muted hover:bg-card"
            }`}
          >
            {e === "todos" ? "Todos" : ESTADO_CAP_PLANEADA_LABEL[e]}
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
            : "bg-surface-2 text-muted hover:bg-card"
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
              : "bg-surface-2 text-muted hover:bg-card"
          }`}
        >
          {AMBITO_LABEL[a]}
        </button>
      ))}
    </div>
  )
}

/** Chip activo removible del filtro de mes (viene del clic en el calendario). */
function ChipMes({ mes }: { mes: number }) {
  const [, setSearchParams] = useSearchParams()

  function quitar() {
    setSearchParams(
      (sp) => {
        const next = new URLSearchParams(sp)
        next.delete("mes")
        next.delete("pagina")
        return next
      },
      { replace: true },
    )
  }

  return (
    <button
      type="button"
      onClick={quitar}
      className="inline-flex items-center gap-1.5 rounded-full bg-navy-deep px-3 py-1 text-xs font-semibold text-white shadow-luxe"
    >
      Mes: {nombreMes(mes)}
      <Icon name="close" className="h-3 w-3" />
    </button>
  )
}

// ── Fila de planeación ──────────────────────────────────────────────────────

function FilaPlaneada({ item }: { item: CapacitacionPlaneada }) {
  const editar = useEditarPlaneada()
  const eliminar = useEliminarPlaneada()
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { className: pillCls, dot, label } = estadoCapacitacionPlaneadaPill(item.estado)
  const siguiente: EstadoCapacitacionPlaneada | null =
    item.estado === "PLANEADA" ? "EN_CURSO" : item.estado === "EN_CURSO" ? "COMPLETADA" : null
  const etiquetaAvance = item.estado === "PLANEADA" ? "Iniciar" : "Completar"

  async function avanzar() {
    if (!siguiente) return
    setError(null)
    try {
      await editar.mutateAsync({ id: item.id, input: { estado: siguiente } })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo actualizar el estado.")
    }
  }

  async function confirmarBorrado() {
    setError(null)
    try {
      await eliminar.mutateAsync(item.id)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar la planeación.")
      setConfirmarEliminar(false)
    }
  }

  return (
    <div className="premium-card space-y-2 rounded-xl px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Dato hero: mes/trimestre planeado, como bloque tabular — el calendario en miniatura. */}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy-50 ring-1 ring-navy-200 dark:bg-surface-2 dark:ring-border">
            <span className="flex flex-col items-center leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-gold-600">
                {nombreMes(item.mes).slice(0, 3)}
              </span>
              <span className="mt-0.5 text-sm font-bold tabular-nums text-navy-700 dark:text-foreground">
                {item.anio}
              </span>
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Icon name="grad-cap" className="h-3.5 w-3.5 shrink-0 text-gold-600" />
              <span className="truncate font-medium text-foreground">{item.titulo}</span>
              <span className={pillCls}>
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {item.areaObjetivo ?? "—"}
              {" · "}
              <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {AMBITO_LABEL[item.ambito]}
              </span>
              {" · "}
              <span className="tabular-nums">T{trimestreDe(item.mes)}</span>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {siguiente && (
            <button
              type="button"
              disabled={editar.isPending}
              onClick={() => void avanzar()}
              className="rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border transition hover:ring-gold-300 disabled:opacity-50"
            >
              {editar.isPending ? "Actualizando…" : etiquetaAvance}
            </button>
          )}
          {confirmarEliminar ? (
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={eliminar.isPending}
                onClick={() => void confirmarBorrado()}
                className="rounded-lg bg-estado-rechazo px-3 py-1.5 text-xs font-semibold text-white shadow-luxe transition hover:opacity-90 disabled:opacity-50"
              >
                Confirmar
              </button>
              <button
                type="button"
                disabled={eliminar.isPending}
                onClick={() => setConfirmarEliminar(false)}
                className="rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-border transition hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarEliminar(true)}
              className="rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-estado-rechazo ring-1 ring-estado-rechazo/30 transition hover:bg-estado-rechazoBg"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}
