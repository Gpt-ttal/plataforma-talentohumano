import { Link } from "react-router-dom"
import { hrefCon } from "@pys/shared"
import type { EstadoGlobal } from "@pys/shared"

interface FiltroActivo {
  q?: string
  estado?: EstadoGlobal
  areaBloqueante?: string
}

interface ItemCuelloBotella {
  areaId: string
  areaNombre: string
  pendientes: number
}

/**
 * Cabecera de "Avance por área": título + cinta de KPIs fundida en la misma
 * superficie navy (no una fila de stat-cards flotando encima). Cada KPI es un
 * filtro clickeable, activo cuando su dimensión coincide con `filtro` — línea
 * dorada bajo el ítem activo. `mostrarCinta` la oculta para Control Interno
 * (que solo supervisa: los datos de la cinta vienen de `/metricas`, SA+TH).
 */
export function AvanceHero({
  basePath,
  mostrarCinta,
  filtro,
  listosParaTraspasar,
  cuellosBotella,
}: {
  basePath: string
  mostrarCinta: boolean
  filtro: FiltroActivo
  listosParaTraspasar: number
  cuellosBotella: ItemCuelloBotella[]
}) {
  const items = mostrarCinta
    ? [
        {
          key: "listos",
          label: "Listos para traspasar",
          valor: listosParaTraspasar,
          activo: filtro.estado === "LISTO_PARA_LIQUIDAR",
          href: hrefCon(basePath, {
            q: filtro.q,
            areaBloqueante: filtro.areaBloqueante,
            estado: filtro.estado === "LISTO_PARA_LIQUIDAR" ? undefined : "LISTO_PARA_LIQUIDAR",
          }),
        },
        ...cuellosBotella.slice(0, 3).map((a) => ({
          key: a.areaId,
          label: `Esperan a ${a.areaNombre}`,
          valor: a.pendientes,
          activo: filtro.areaBloqueante === a.areaId,
          href: hrefCon(basePath, {
            q: filtro.q,
            estado: filtro.estado,
            areaBloqueante: filtro.areaBloqueante === a.areaId ? undefined : a.areaId,
          }),
        })),
      ]
    : []

  return (
    <div className="animate-card-in overflow-hidden rounded-2xl shadow-luxe">
      <div className="bg-navy-deep px-6 pb-6 pt-6 sm:px-8 sm:pt-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Avance por área
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-white/70">
          Qué áreas ya dieron el visto bueno y cuáles faltan, por colaborador. Toca un
          indicador para filtrar la tabla.
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 bg-navy-900 sm:grid-cols-4 sm:divide-y-0">
          {items.map((it) => (
            <Link
              key={it.key}
              to={it.href}
              aria-pressed={it.activo}
              className="group relative px-4 py-3.5 transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none"
            >
              <span className="block text-xl font-bold tabular-nums text-white sm:text-2xl">
                {it.valor}
              </span>
              <span className="mt-0.5 block truncate text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/60">
                {it.label}
              </span>
              {it.activo && (
                <span
                  className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-gold-400"
                  aria-hidden
                />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
