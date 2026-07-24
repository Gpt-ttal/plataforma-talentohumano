import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { COLOR_STATUS_VACANTE, STATUS_VACANTE_LABEL } from "@pys/shared"
import type { SerieCategoriaVacante, StatusVacante } from "@pys/shared"
import { ChartTooltip, VacioChart } from "../../panel/charts/chartTheme"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion"
import { fmt } from "../../../components/ui/dash/format"

const ORDEN: StatusVacante[] = ["VIGENTE", "VENCIDA", "CUBIERTA", "CERRADA"]

/**
 * Donut de distribución por STATUS derivado. Colores desde `COLOR_STATUS_VACANTE`
 * (Semáforo Único, mismo tono que `EstadoVacantePill`). El total al centro y la
 * leyenda textual debajo dan la alternativa accesible al SVG.
 */
export default function DonutPorStatus({ porStatus }: { porStatus: SerieCategoriaVacante[] }) {
  const reduce = usePrefersReducedMotion()
  const totales = new Map(porStatus.map((s) => [s.label, s.total]))
  const total = ORDEN.reduce((s, e) => s + (totales.get(e) ?? 0), 0)
  const data = ORDEN.map((e) => ({
    estado: e,
    label: STATUS_VACANTE_LABEL[e],
    valor: totales.get(e) ?? 0,
    color: COLOR_STATUS_VACANTE[e],
  })).filter((d) => d.valor > 0)

  if (total === 0) return <VacioChart>Sin vacantes para mostrar.</VacioChart>

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={216}>
          <PieChart>
            <Pie
              data={data}
              dataKey="valor"
              nameKey="label"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!reduce}
            >
              {data.map((d) => (
                <Cell key={d.estado} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-foreground">{fmt(total)}</span>
          <span className="text-[11px] text-muted">vacantes</span>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <li key={d.estado} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-muted">{d.label}</span>
            <span className="font-mono tabular-nums text-foreground">{fmt(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
