import { useState } from "react"
import { Link, Outlet, useSearchParams } from "react-router-dom"
import { ESTADO_VACANTE_LABEL, ESTADOS_VACANTE, POR_PAGINA_DEFECTO } from "@pys/shared"
import type { EstadoVacante, VacanteDerivada } from "@pys/shared"
import { useVacantes, useVacantesCatalogos } from "../../hooks/useVacantes"
import { Buscador } from "../../components/ui/Buscador"
import { ChipFiltro } from "../../components/ui/ChipFiltro"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Paginacion } from "../../components/ui/Paginacion"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { Segmented } from "../../components/ui/Segmented"
import { Icon } from "../../components/ui/dash/Icon"
import { EstadoVacantePill } from "../../components/ui/VacantePills"
import { NuevaVacanteModal } from "./NuevaVacanteModal"

const BASE = "/vacantes"

/**
 * Listado de Vacantes — vista por defecto (herramienta diaria). Cada fila es un
 * enlace a `/vacantes/:id` que abre la ficha completa en un modal centrado sobre
 * la lista (ruta hija montada en `<Outlet/>`), sin salir de la página. La fila
 * muestra solo el STATUS derivado (§3.5 del spec); fase, aprobación y estado
 * capturado viven dentro del modal para no saturar con 3 semáforos distintos.
 */
export function VacantesPage() {
  const [searchParams] = useSearchParams()
  const [crearAbierto, setCrearAbierto] = useState(false)
  const catalogos = useVacantesCatalogos()

  const q = searchParams.get("q") ?? undefined
  const estado = (searchParams.get("estado") as EstadoVacante | null) ?? undefined
  const areaId = searchParams.get("areaId") ?? undefined
  const pagina = searchParams.get("pagina") ? Number(searchParams.get("pagina")) : undefined

  const { data, isLoading, isError } = useVacantes({
    q,
    estado,
    areaId,
    pagina,
    porPagina: POR_PAGINA_DEFECTO,
  })

  return (
    <div className="space-y-7">
      <PageHeader
        title="Vacantes"
        description="Seguimiento del proceso de contratación: desde la solicitud del área hasta la vinculación del nuevo empleado."
        meta={
          <>
            <span>Gestión Humana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">Procesos de contratación</HeaderMetaDot>
          </>
        }
        actions={
          <button
            type="button"
            onClick={() => setCrearAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold-400"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nueva vacante
          </button>
        }
      />

      <Segmented
        etiqueta="Vista de Vacantes"
        activo="listado"
        opciones={[
          { value: "listado", label: "Listado", href: "/vacantes" },
          { value: "resumen", label: "Resumen", href: "/vacantes/resumen" },
        ]}
      />

      {crearAbierto && <NuevaVacanteModal onClose={() => setCrearAbierto(false)} />}

      <div className="premium-card flex flex-wrap items-end gap-3 rounded-xl px-4 py-4">
        <div className="flex-1">
          <Buscador placeholder="Buscar por cargo…" />
        </div>
        <FiltroArea areaId={areaId} areas={catalogos.data?.areas ?? []} />
      </div>

      <FiltroEstado estado={estado} />

      {isLoading ? (
        <ListaSkeleton filas={POR_PAGINA_DEFECTO} />
      ) : isError ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudieron cargar las vacantes"
          mensaje="Hubo un problema al consultar el catálogo. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icono={<Icon name="briefcase" className="h-6 w-6 text-muted" />}
          titulo="Sin vacantes"
          mensaje={
            q || estado || areaId
              ? "Ninguna vacante coincide con tu búsqueda."
              : "No hay vacantes registradas todavía. Crea la primera arriba."
          }
          accion={
            !q && !estado && !areaId && (
              <button
                type="button"
                onClick={() => setCrearAbierto(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold-400"
              >
                <Icon name="plus" className="h-4 w-4" />
                Nueva vacante
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-7">
          <div className="space-y-2.5">
            {data.items.map((v) => (
              <FilaVacante key={v.id} vacante={v} areaNombre={nombreArea(v.areaId, catalogos.data?.areas)} />
            ))}
          </div>
          <Paginacion
            basePath={BASE}
            params={{ q, estado, areaId }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}

      {/* Modal de detalle (ruta hija `:id`): se monta encima sin desmontar la lista. */}
      <Outlet />
    </div>
  )
}

function nombreArea(
  areaId: string | null,
  areas: { id: string; nombre: string }[] | undefined,
): string | null {
  if (!areaId || !areas) return null
  return areas.find((a) => a.id === areaId)?.nombre ?? null
}

// ── Filtros server-driven ─────────────────────────────────────────────────

/** Construye el href relativo preservando `q`/`areaId` y resetea `pagina` al cambiar de filtro. */
function hrefFiltroEstado(estado: EstadoVacante | undefined): string {
  const sp = new URLSearchParams(window.location.search)
  sp.delete("pagina")
  if (estado) sp.set("estado", estado)
  else sp.delete("estado")
  const s = sp.toString()
  return s ? `${BASE}?${s}` : BASE
}

function FiltroEstado({ estado }: { estado: EstadoVacante | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipFiltro label="Todas" activo={!estado} href={hrefFiltroEstado(undefined)} />
      {ESTADOS_VACANTE.map((e) => (
        <ChipFiltro key={e} label={ESTADO_VACANTE_LABEL[e]} activo={estado === e} href={hrefFiltroEstado(e)} />
      ))}
    </div>
  )
}

function FiltroArea({
  areaId,
  areas,
}: {
  areaId: string | undefined
  areas: { id: string; nombre: string }[]
}) {
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">Área</span>
      <select
        value={areaId ?? ""}
        onChange={(e) => {
          const sp = new URLSearchParams(searchParams)
          if (e.target.value) sp.set("areaId", e.target.value)
          else sp.delete("areaId")
          sp.delete("pagina")
          setSearchParams(sp, { replace: true })
        }}
        className="rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 dark:bg-surface-2 dark:text-foreground dark:border-border"
      >
        <option value="">Todas las áreas</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>
    </label>
  )
}

// ── Fila de vacante (enlace al modal de detalle) ──────────────────────────

function FilaVacante({ vacante: v, areaNombre }: { vacante: VacanteDerivada; areaNombre: string | null }) {
  return (
    <Link
      to={v.id}
      className="premium-card row-fade group flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 shadow-luxe transition-shadow hover:shadow-luxe-lg sm:px-4"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-50 ring-1 ring-navy-200 transition-colors group-hover:ring-gold-200 dark:bg-surface-2 dark:ring-border">
        <Icon name="briefcase" className="h-4.5 w-4.5 text-navy-700 dark:text-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-navy-900 dark:text-foreground">
          {v.cargo}
        </span>
        <span className="block text-xs tabular-nums text-silver-600">
          {v.posiciones} posición{v.posiciones === 1 ? "" : "es"}
          {areaNombre ? ` · ${areaNombre}` : ""}
          {v.requerimiento ? ` · N.º ${v.requerimiento}` : ""}
        </span>
      </span>
      {v.status && <EstadoVacantePill status={v.status} />}
      <Icon
        name="arrow"
        className="h-4 w-4 shrink-0 text-silver-500 transition-colors group-hover:text-gold-500"
      />
    </Link>
  )
}
