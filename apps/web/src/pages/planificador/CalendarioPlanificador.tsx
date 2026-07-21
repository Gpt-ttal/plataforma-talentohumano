import { Link } from "react-router-dom"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { estadoCapacitacionPlaneadaPill, hrefCon } from "@pys/shared"
import type { CapacitacionPlaneada } from "@pys/shared"
import { usePlanificador } from "../../hooks/usePlanificador"
import { EmptyState } from "../../components/ui/EmptyState"
import { Icon } from "../../components/ui/dash/Icon"

const BASE = "/planificador"
const MESES = Array.from({ length: 12 }, (_, i) => i + 1)

/** Nombre del mes en español, capitalizado (p. ej. "Enero"). Solo presentación. */
export function nombreMes(mes: number): string {
  const raw = format(new Date(2000, mes - 1, 1), "LLLL", { locale: es })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function NavegacionAnio({ anio }: { anio: number }) {
  return (
    <div className="flex items-center justify-center gap-4">
      <Link
        to={hrefCon(BASE, { anio: anio - 1, vista: "calendario" })}
        aria-label="Año anterior"
        className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border transition hover:ring-gold-300"
      >
        ‹
      </Link>
      <span className="min-w-[4ch] text-center font-display text-xl font-bold tabular-nums text-foreground">
        {anio}
      </span>
      <Link
        to={hrefCon(BASE, { anio: anio + 1, vista: "calendario" })}
        aria-label="Año siguiente"
        className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border transition hover:ring-gold-300"
      >
        ›
      </Link>
    </div>
  )
}

/**
 * Calendario "año de un vistazo" del Planificador: 12 celdas de mes (no
 * día-por-día, el dato no tiene día). Cada celda es un `Link` a la vista lista
 * filtrada por ese mes/año. Trae el año completo (`porPagina:100`, el tope real
 * del schema — sobra para el volumen esperado de planeaciones anuales).
 */
export function CalendarioPlanificador({ anio }: { anio: number }) {
  const { data, isLoading, isError } = usePlanificador({ anio, porPagina: 100 })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <NavegacionAnio anio={anio} />
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          aria-hidden
        >
          {MESES.map((m) => (
            <div
              key={m}
              className="premium-skeleton h-32 rounded-xl motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <NavegacionAnio anio={anio} />
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar el calendario"
          mensaje="Hubo un problema al consultar la agenda del año. Revisa tu conexión e inténtalo de nuevo."
        />
      </div>
    )
  }

  const itemsPorMes = new Map<number, CapacitacionPlaneada[]>()
  for (const m of MESES) itemsPorMes.set(m, [])
  for (const item of data?.items ?? []) {
    itemsPorMes.get(item.mes)?.push(item)
  }

  return (
    <div className="space-y-4">
      <NavegacionAnio anio={anio} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MESES.map((m) => {
          const items = itemsPorMes.get(m) ?? []
          const visibles = items.slice(0, 3)
          const restantes = items.length - visibles.length
          const conItems = items.length > 0

          return (
            <Link
              key={m}
              to={hrefCon(BASE, { vista: "lista", anio, mes: m })}
              className={`premium-card flex flex-col gap-2 rounded-xl px-4 py-3 transition hover:shadow-luxe-lg focus:outline-none focus:ring-2 focus:ring-gold-300 ${
                conItems ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-foreground">
                  {nombreMes(m)}
                </span>
                <span className="font-mono text-xs tabular-nums text-muted">
                  {items.length}
                </span>
              </div>

              {conItems ? (
                <div className="flex flex-col gap-1">
                  {visibles.map((it) => {
                    const { dot } = estadoCapacitacionPlaneadaPill(it.estado)
                    return (
                      <span
                        key={it.id}
                        className="flex items-center gap-1.5 truncate text-xs text-muted"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        <span className="truncate">{it.titulo}</span>
                      </span>
                    )
                  })}
                  {restantes > 0 && (
                    <span className="text-xs font-medium text-faint">
                      +{restantes} más
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-faint">Sin planeaciones</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
