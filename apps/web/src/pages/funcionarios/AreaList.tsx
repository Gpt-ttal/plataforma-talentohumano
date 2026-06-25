import type { AprobacionConArea } from "@pys/shared"
import { AccionesArea } from "./AccionesArea"
import { EstadoAreaPill } from "../../components/ui/EstadoPill"

/**
 * Lista de las áreas de visto bueno de un funcionario (pantalla de detalle).
 *
 * `puedeGestionar`: si es `true` (solo SUPERADMIN en el catálogo) muestra la
 * botonera `AccionesArea`; si es `false` muestra cada área en modo solo lectura.
 * Los usuarios AREA gestionan sus áreas en /mi-área, no aquí.
 *
 * Craft Sello-safe:
 * - Hover doble-señal: `shadow-luxe → shadow-luxe-lg` + `border-gold-300/40`.
 * - Borde completo, sin filete lateral.
 * - `tabular-nums` en el chip de orden.
 */
export function AreaList({
  funcionarioId,
  aprobaciones,
  puedeGestionar = false,
}: {
  funcionarioId: string
  aprobaciones: AprobacionConArea[]
  puedeGestionar?: boolean
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {aprobaciones.map((ap) => (
        <li
          key={ap.id}
          className="rounded-xl border border-silver-200 bg-white p-4 shadow-luxe transition hover:border-gold-300/40 hover:shadow-luxe-lg"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-navy-50 text-[11px] font-semibold tabular-nums text-navy-600">
                {ap.orden}
              </span>
              <span className="truncate text-sm font-medium text-navy-800">
                {ap.areaNombre}
              </span>
            </div>
            <EstadoAreaPill estado={ap.estado} />
          </div>

          {puedeGestionar && (
            <div className="mt-3 border-t border-silver-100 pt-3">
              <AccionesArea
                funcionarioId={funcionarioId}
                areaId={ap.areaId}
                estado={ap.estado}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
