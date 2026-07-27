import { Link, useSearchParams } from "react-router-dom"
import {
  ESTADO_VINCULACION_LABEL,
  ESTADOS_VINCULACION,
  estadoVinculacion,
  POR_PAGINA_DEFECTO,
  TIPO_VINCULACION_LABEL,
  TIPOS_VINCULACION,
} from "@pys/shared"
import type { Empleado, EstadoVinculacion, TipoVinculacion } from "@pys/shared"
import { usePersonal } from "../../hooks/usePersonal"
import { Avatar } from "../../components/ui/Avatar"
import { EstadoVinculacionPill } from "../../components/ui/EstadoPill"
import { Buscador } from "../../components/ui/Buscador"
import { ChipFiltro } from "../../components/ui/ChipFiltro"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Paginacion } from "../../components/ui/Paginacion"
import { SpotSinEmpleados } from "../../components/ui/spot/Spots"
import { Icon } from "../../components/ui/dash/Icon"

const BASE = "/personal"

/**
 * Catálogo del maestro de empleados: alta manual + búsqueda/filtros server-driven
 * + listado. Cada fila es un enlace a `/personal/:id` que abre la hoja de vida
 * 360° (detalle + acciones: Finalizar contrato, Otro sí, Actualizar datos) en un
 * modal sobre el maestro (ruta hija montada en el `<Outlet/>` de `PersonalPage`).
 */
export function CatalogoPersonal() {
  const [searchParams] = useSearchParams()

  const q = searchParams.get("q") ?? undefined
  const tipoVinculacion = (searchParams.get("tipoVinculacion") as TipoVinculacion | null) ?? undefined
  const vinculoEstado = (searchParams.get("vinculoEstado") as EstadoVinculacion | null) ?? undefined
  const pagina = searchParams.get("pagina") ? Number(searchParams.get("pagina")) : undefined

  const { data, isLoading, isError } = usePersonal({
    q,
    tipoVinculacion,
    vinculoEstado,
    pagina,
    porPagina: POR_PAGINA_DEFECTO,
  })

  return (
    <div className="space-y-7">
      <div className="premium-card flex flex-wrap items-end gap-3 rounded-xl px-4 py-4">
        <div className="flex-1">
          <Buscador placeholder="Buscar por nombre o documento…" />
        </div>
        <FiltroEstadoVinculo estado={vinculoEstado} />
        <FiltroTipoVinculacion tipo={tipoVinculacion} />
      </div>

      {isLoading ? (
        <ListaSkeleton filas={POR_PAGINA_DEFECTO} />
      ) : isError ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar el personal"
          mensaje="Hubo un problema al consultar el maestro de empleados. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          ilustracion={<SpotSinEmpleados />}
          titulo="Sin empleados"
          mensaje="No hay empleados que coincidan con la búsqueda o los filtros. Regístralo arriba."
        />
      ) : (
        <div className="space-y-7">
          <div className="space-y-2.5">
            {data.items.map((e) => (
              <FilaEmpleado key={e.id} empleado={e} />
            ))}
          </div>
          <Paginacion
            basePath={BASE}
            params={{ q, tipoVinculacion, vinculoEstado }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}
    </div>
  )
}

// ── Filtros server-driven ─────────────────────────────────────────────────

function FiltroEstadoVinculo({ estado }: { estado: EstadoVinculacion | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipFiltro
        label="Todos"
        activo={!estado}
        href={hrefSinPagina({ vinculoEstado: undefined })}
      />
      {ESTADOS_VINCULACION.map((e) => (
        <ChipFiltro
          key={e}
          label={ESTADO_VINCULACION_LABEL[e]}
          activo={estado === e}
          href={hrefSinPagina({ vinculoEstado: e })}
        />
      ))}
    </div>
  )
}

function FiltroTipoVinculacion({ tipo }: { tipo: TipoVinculacion | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipFiltro
        label="Cualquier vínculo"
        activo={!tipo}
        href={hrefSinPagina({ tipoVinculacion: undefined })}
      />
      {TIPOS_VINCULACION.map((t) => (
        <ChipFiltro
          key={t}
          label={TIPO_VINCULACION_LABEL[t]}
          activo={tipo === t}
          href={hrefSinPagina({ tipoVinculacion: t })}
        />
      ))}
    </div>
  )
}

/** Construye el href relativo preservando `q` y resetea `pagina` al cambiar de filtro. */
function hrefSinPagina(cambio: {
  vinculoEstado?: EstadoVinculacion
  tipoVinculacion?: TipoVinculacion
}): string {
  const sp = new URLSearchParams(window.location.search)
  sp.delete("pagina")
  for (const [clave, valor] of Object.entries(cambio)) {
    if (valor) sp.set(clave, valor)
    else sp.delete(clave)
  }
  const s = sp.toString()
  return s ? `${BASE}?${s}` : BASE
}

// ── Fila de empleado (enlace al modal de expediente 360°) ──────────────────

function FilaEmpleado({ empleado: e }: { empleado: Empleado }) {
  return (
    <Link
      to={e.id}
      className="premium-card row-fade group flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 shadow-luxe transition-shadow hover:shadow-luxe-lg sm:px-4"
    >
      <Avatar nombre={e.nombreCompleto} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-navy-900 dark:text-foreground">
          {e.nombreCompleto}
        </span>
        <span className="block text-xs text-silver-600 tabular-nums">
          CC {e.documento} · {e.cargo} · {e.areaOrigen}
        </span>
      </span>
      <EstadoVinculacionPill estado={estadoVinculacion(e)} />
      <Icon
        name="arrow"
        className="h-4 w-4 shrink-0 text-silver-500 transition-colors group-hover:text-gold-500"
      />
    </Link>
  )
}
