import { useState } from "react"
import { Outlet, useSearchParams } from "react-router-dom"
import {
  AMBITO_LABEL,
  ambitosVisibles,
  ESTADO_REGISTRO_BADGE,
  ESTADO_REGISTRO_DOT,
  ESTADO_REGISTRO_LABEL,
  POR_PAGINA_DEFECTO,
} from "@pys/shared"
import type { AmbitoCapacitacion, Capacitacion, EstadoRegistro } from "@pys/shared"
import { useCapacitaciones } from "../../hooks/useCapacitaciones"
import { useRole } from "../../hooks/useRole"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Buscador } from "../../components/ui/Buscador"
import { Paginacion } from "../../components/ui/Paginacion"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { Icon } from "../../components/ui/dash/Icon"
import { GestionCapacitacion } from "./GestionCapacitacion"
import { NuevaCapacitacionModal } from "./NuevaCapacitacionModal"

const BASE = "/capacitaciones"

/**
 * Módulo de Capacitaciones — listado + gestión (TH · SST · SA). Filtra por rol
 * en el backend (TH → TH, SST → SST, SA → ambos). La ruta hija `:id` abre el
 * modal de detalle con el QR.
 */
export function CapacitacionesPage() {
  const { rol } = useRole()
  const [searchParams] = useSearchParams()
  const [crearAbierto, setCrearAbierto] = useState(false)

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
        actions={
          rol && (
            <button
              type="button"
              onClick={() => setCrearAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold-400"
            >
              <Icon name="plus" className="h-4 w-4" />
              Nueva capacitación
            </button>
          )
        }
      />

      {/* Formulario de creación */}
      {crearAbierto && rol && (
        <NuevaCapacitacionModal rol={rol} onClose={() => setCrearAbierto(false)} />
      )}

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

/** Fecha de un evento como bloque día/mes — el dato hero de Eventos, visible sin expandir. */
function BloqueFecha({ iso }: { iso: string }) {
  const d = new Date(iso)
  const dia = d.toLocaleDateString("es-CO", { day: "2-digit" })
  const mes = d.toLocaleDateString("es-CO", { month: "short" }).replace(".", "")

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-navy-50 ring-1 ring-navy-200 dark:bg-surface-2 dark:ring-border">
      <span className="flex flex-col items-center leading-none">
        <span className="text-sm font-bold tabular-nums text-navy-700 dark:text-foreground">{dia}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold-600">
          {mes}
        </span>
      </span>
    </span>
  )
}

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
          <BloqueFecha iso={c.iniciaEn} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <Icon name="calendar" className="h-3.5 w-3.5 shrink-0 text-gold-600" />
              <span className="truncate font-medium text-navy-900">{c.titulo}</span>
            </span>
            <span className="block text-xs text-silver-600">
              {AMBITO_LABEL[c.ambito]}
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

