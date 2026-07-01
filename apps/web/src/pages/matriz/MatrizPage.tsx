import { Link, useSearchParams } from "react-router-dom"
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
import { useRole } from "../../hooks/useRole"
import { Buscador } from "../../components/ui/Buscador"
import { ChipFiltro } from "../../components/ui/ChipFiltro"
import { Paginacion } from "../../components/ui/Paginacion"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { EstadoGlobalPill } from "../../components/ui/EstadoPill"
import { CeldaMatriz } from "../../components/ui/CeldaMatriz"
import { Icon } from "../../components/ui/dash/Icon"
import { AreaIcon } from "../../components/ui/AreaIcon"
import { SpotSinResultados } from "../../components/ui/spot/Spots"

const BASE = "/paz-y-salvo/avance"

/**
 * Matriz consolidada funcionario × área activa para los supervisores (TH/CI/SA):
 * "este colaborador solo está esperando a Sistemas". Solo lectura — clic en la
 * fila abre la ficha en la oficina del rol. Búsqueda y filtro de estado global
 * server-driven; las columnas (áreas activas) las resuelve el backend.
 */
export function MatrizPage() {
  const { rol } = useRole()
  const [searchParams] = useSearchParams()

  const sp = Object.fromEntries(searchParams)
  const filtro = parseFiltroFuncionarios(sp)

  const { data, isLoading } = useMatriz({ ...filtro, porPagina: POR_PAGINA_DEFECTO })

  // Clic en el colaborador → su ficha en la oficina del rol (reusa el modal `:id`).
  const oficina = rol ? rutaOficinaPorRol(rol) : "/paz-y-salvo/funcionarios"

  return (
    <div className="space-y-7">
      <PageHeader
        title="Avance por área"
        description="Qué áreas ya dieron el visto bueno y cuáles faltan, por colaborador. Toca una fila para abrir su ficha."
        meta={
          <>
            <span>Visibilidad consolidada</span>
            <span className="hidden text-faint sm:inline">/</span>
            <HeaderMetaDot tone="gold">Matriz funcionario × área</HeaderMetaDot>
          </>
        }
      />

      {/* Controles: búsqueda + filtro de estado global. */}
      <div className="premium-card space-y-3 rounded-xl px-4 py-4">
        <Buscador />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Estado
          </span>
          <ChipFiltro
            label="Todos"
            activo={!filtro.estado}
            href={hrefCon(BASE, { q: filtro.q })}
          />
          {ESTADOS_GLOBAL.map((e) => (
            <ChipFiltro
              key={e}
              label={ESTADO_GLOBAL_LABEL[e]}
              activo={filtro.estado === e}
              href={hrefCon(BASE, { q: filtro.q, estado: e })}
            />
          ))}
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
                      className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted"
                    >
                      <span className="mx-auto flex max-w-[5.5rem] flex-col items-center gap-1 text-muted">
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
                    href={`${oficina}/${fila.funcionario.id}`}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <Paginacion
            basePath={BASE}
            params={{ q: filtro.q, estado: filtro.estado }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}
    </div>
  )
}

/** Una fila de la matriz: colaborador (sticky, enlace a la ficha) + celda por área + estado. */
function FilaMatrizTabla({
  fila,
  areaIds,
  href,
}: {
  fila: FilaMatriz
  areaIds: string[]
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
        <td key={areaId} className="px-2 py-3 text-center group-hover:bg-surface-2/60">
          <CeldaMatriz estado={fila.estados[areaId]} />
        </td>
      ))}
      <td className="px-4 py-3 text-right group-hover:bg-surface-2/60">
        <EstadoGlobalPill estado={f.estadoGlobal} />
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
