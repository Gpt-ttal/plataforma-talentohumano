import { Link, Outlet, useSearchParams } from "react-router-dom"
import {
  hrefCon,
  parseFiltroFuncionarios,
  POR_PAGINA_DEFECTO,
  ESTADOS_GLOBAL,
  ESTADO_GLOBAL_LABEL,
  rutaOficinaPorRol,
  formatFecha,
} from "@pys/shared"
import type { FilaMatriz } from "@pys/shared"
import { useMatriz } from "../../hooks/useMatriz"
import { useFuncionarios } from "../../hooks/useFuncionarios"
import { useMetricas } from "../../hooks/useMetricas"
import { useRole } from "../../hooks/useRole"
import { Avatar } from "../../components/ui/Avatar"
import { Buscador } from "../../components/ui/Buscador"
import { ChipFiltro } from "../../components/ui/ChipFiltro"
import { Paginacion } from "../../components/ui/Paginacion"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { EstadoGlobalPill } from "../../components/ui/EstadoPill"
import { CeldaMatriz } from "../../components/ui/CeldaMatriz"
import { Icon } from "../../components/ui/dash/Icon"
import { AreaIcon } from "../../components/ui/AreaIcon"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { AvanceHero } from "./AvanceHero"

const BASE = "/paz-y-salvo/avance"

/**
 * Matriz consolidada funcionario × área activa: la oficina de trabajo de SA y
 * TH (sus catálogos dedicados se retiraron por redundancia — TH ahora valida
 * que todas las áreas dieron visto bueno antes de pasar el caso a Control
 * Interno). CI conserva su oficina propia y usa esta vista solo en modo
 * supervisión (sin la cinta de KPIs ni la bandeja de traspaso, ambas SA+TH).
 * Búsqueda + estado global + área bloqueante son filtros combinables por URL;
 * clic en la fila abre la ficha en el modal `:id` montado aquí (`<Outlet/>`).
 */
export function MatrizPage() {
  const { rol, esSuperadmin, esTalentoHumano } = useRole()
  const [searchParams] = useSearchParams()

  const sp = Object.fromEntries(searchParams)
  const filtro = parseFiltroFuncionarios(sp)
  const areaBloqueante = searchParams.get("areaBloqueante") ?? undefined

  const { data, isLoading } = useMatriz({
    ...filtro,
    areaBloqueante,
    porPagina: POR_PAGINA_DEFECTO,
  })

  // La cinta de KPIs y la bandeja de traspaso son trabajo de SA/TH; CI solo
  // supervisa (mismo alcance que la guarda de `/metricas` en el backend).
  const puedeGestionar = esSuperadmin || esTalentoHumano
  const { data: metricas } = useMetricas({ enabled: puedeGestionar })
  const { data: bandeja } = useFuncionarios(
    { estado: "LISTO_PARA_LIQUIDAR", porPagina: 5 },
    { enabled: puedeGestionar },
  )

  // Clic en el colaborador → su ficha en la oficina del rol (reusa el modal `:id`).
  const oficina = rol ? rutaOficinaPorRol(rol) : BASE
  const nombreAreaBloqueante = metricas?.pendientesPorArea.find(
    (a) => a.areaId === areaBloqueante,
  )?.areaNombre

  return (
    <div className="space-y-7">
      <AvanceHero
        basePath={BASE}
        mostrarCinta={puedeGestionar}
        filtro={{ q: filtro.q, estado: filtro.estado, areaBloqueante }}
        listosParaTraspasar={bandeja?.total ?? 0}
        cuellosBotella={metricas?.pendientesPorArea ?? []}
      />

      {puedeGestionar && (bandeja?.items.length ?? 0) > 0 && (
        <BandejaTraspaso
          items={bandeja!.items}
          total={bandeja!.total}
          href={hrefCon(BASE, { q: filtro.q, estado: "LISTO_PARA_LIQUIDAR" })}
        />
      )}

      {/* Controles: búsqueda + filtro de estado global + área bloqueante activa. */}
      <div className="premium-card space-y-3 rounded-xl px-4 py-4">
        <Buscador />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Estado
          </span>
          <ChipFiltro
            label="Todos"
            activo={!filtro.estado}
            href={hrefCon(BASE, { q: filtro.q, areaBloqueante })}
          />
          {ESTADOS_GLOBAL.map((e) => (
            <ChipFiltro
              key={e}
              label={ESTADO_GLOBAL_LABEL[e]}
              activo={filtro.estado === e}
              href={hrefCon(BASE, { q: filtro.q, estado: e, areaBloqueante })}
            />
          ))}
          {areaBloqueante && (
            <Link
              to={hrefCon(BASE, { q: filtro.q, estado: filtro.estado })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-estado-rechazoBg px-3 py-1.5 text-xs font-semibold text-estado-rechazo ring-1 ring-estado-rechazo/30 transition-colors hover:ring-estado-rechazo/50"
            >
              Filtrado: {nombreAreaBloqueante ?? "área"}
              <span aria-hidden>✕</span>
            </Link>
          )}
        </div>
      </div>

      {isLoading || !data ? (
        <ListaSkeleton filas={POR_PAGINA_DEFECTO} />
      ) : data.items.length === 0 ? (
        <EmptyState
          ilustracion={<SpotSinResultados />}
          titulo="Sin resultados"
          mensaje="No hay colaboradores que coincidan con la búsqueda o el filtro actual."
        />
      ) : data.areas.length === 0 ? (
        <EmptyState
          icono={<Icon name="grid" className="h-6 w-6" />}
          titulo="Sin áreas activas"
          mensaje="No hay dependencias activas que exijan visto bueno. Actívalas en el catálogo de áreas."
        />
      ) : (
        <div className="space-y-7">
          {/* Leyenda compacta del semáforo de la celda. */}
          <Leyenda />

          <div className="premium-card overflow-x-auto rounded-xl">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Colaborador
                  </th>
                  {data.areas.map((a) => (
                    <th
                      key={a.id}
                      scope="col"
                      title={a.nombre}
                      className={`px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                        a.id === areaBloqueante
                          ? "bg-estado-rechazoBg/60 text-estado-rechazo"
                          : "text-muted"
                      }`}
                    >
                      <span
                        className={`mx-auto flex max-w-[5.5rem] flex-col items-center gap-1 ${
                          a.id === areaBloqueante ? "text-estado-rechazo" : "text-muted"
                        }`}
                      >
                        <AreaIcon nombre={a.nombre} variant="bare" />
                        <span className="block w-full truncate">{a.nombre}</span>
                      </span>
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted"
                  >
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((fila) => (
                  <FilaMatrizTabla
                    key={fila.funcionario.id}
                    fila={fila}
                    areaIds={data.areas.map((a) => a.id)}
                    areaBloqueante={areaBloqueante}
                    href={`${oficina}/${fila.funcionario.id}`}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Paginacion
            basePath={BASE}
            params={{ q: filtro.q, estado: filtro.estado, areaBloqueante }}
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

/**
 * Bandeja de traspaso: hasta 5 colaboradores ya listos para pasar a Control
 * Interno. "Ver los N →" apunta al mismo filtro que clickear el KPI de la
 * cinta (no se duplica lógica). Visible solo para SA/TH.
 */
function BandejaTraspaso({
  items,
  total,
  href,
}: {
  items: { id: string; nombreCompleto: string; fechaRetiro: string }[]
  total: number
  href: string
}) {
  return (
    <div className="premium-card rounded-xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Listos para traspasar a Control Interno
        </span>
        {total > items.length && (
          <Link
            to={href}
            className="shrink-0 text-xs font-semibold text-navy-600 transition-colors hover:text-gold-600 dark:text-gold-300"
          >
            Ver los {total} →
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {items.map((f) => (
          <Link
            key={f.id}
            to={href}
            className="inline-flex items-center gap-2 rounded-lg bg-card px-2.5 py-1.5 ring-1 ring-border transition-colors hover:ring-gold-300"
          >
            <Avatar nombre={f.nombreCompleto} size="sm" />
            <span className="min-w-0">
              <span className="block max-w-[9rem] truncate text-xs font-medium text-foreground">
                {f.nombreCompleto}
              </span>
              <span className="block text-[10.5px] text-muted tabular-nums">
                retiro {formatFecha(f.fechaRetiro)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** Una fila de la matriz: colaborador (sticky) + celda por área + estado, con
 *  el afordance "Ver ficha →" revelado al pasar el mouse (siempre visible en
 *  touch). La columna del área bloqueante activa resalta su celda. */
function FilaMatrizTabla({
  fila,
  areaIds,
  areaBloqueante,
  href,
}: {
  fila: FilaMatriz
  areaIds: string[]
  areaBloqueante?: string
  href: string
}) {
  const f = fila.funcionario
  return (
    <tr className="group border-b border-border/70 transition-colors last:border-0">
      <td className="sticky left-0 z-10 bg-card px-4 py-3 group-hover:bg-surface-2/60">
        <Link
          to={href}
          className="block rounded outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        >
          <span className="block truncate font-medium text-foreground transition-colors group-hover:text-gold-700">
            {f.nombreCompleto}
          </span>
          <span className="block text-xs text-muted tabular-nums">
            CC {f.documento} · retiro {formatFecha(f.fechaRetiro)}
          </span>
        </Link>
      </td>
      {areaIds.map((areaId) => (
        <td
          key={areaId}
          className={`px-2 py-3 text-center transition-colors ${
            areaId === areaBloqueante ? "bg-estado-rechazoBg/60" : "group-hover:bg-surface-2/60"
          }`}
        >
          <CeldaMatriz estado={fila.estados[areaId]} />
        </td>
      ))}
      <td className="px-4 py-3 group-hover:bg-surface-2/60">
        <div className="flex items-center justify-end gap-2.5">
          <Link
            to={href}
            className="whitespace-nowrap text-xs font-semibold text-gold-600 opacity-0 outline-none transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
          >
            Ver ficha →
          </Link>
          <EstadoGlobalPill estado={f.estadoGlobal} />
        </div>
      </td>
    </tr>
  )
}

/** Leyenda del semáforo de la celda (✓ aprobado · • pendiente · – no aplica · ✕ rechazado). */
function Leyenda() {
  const items: { simbolo: string; label: string; className: string }[] = [
    { simbolo: "✓", label: "Aprobado", className: "text-estado-ok" },
    { simbolo: "•", label: "Pendiente", className: "text-muted" },
    { simbolo: "–", label: "No aplica", className: "text-muted" },
    { simbolo: "✕", label: "Rechazado", className: "text-estado-rechazo" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`font-semibold ${i.className}`} aria-hidden>
            {i.simbolo}
          </span>
          {i.label}
        </span>
      ))}
    </div>
  )
}
