import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import type { EstadoGlobal } from "@pys/shared"
import { COLOR_ESTADO, ESTADO_GLOBAL_LABEL } from "@pys/shared"
import { ChartTooltip, VacioChart } from "./chartTheme"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion"
import { fmt } from "../../../components/ui/dash/format"

const ORDEN: EstadoGlobal[] = [
  "PENDIENTE",
  "LISTO_PARA_LIQUIDAR",
  "LIQUIDACION_GENERADA",
  "PAZ_Y_SALVO",
]

/**
 * Donut de distribución por estado global. Colores desde `COLOR_ESTADO` (Semáforo
 * Único). El total al centro y la leyenda textual debajo dan la alternativa
 * accesible al SVG.
 */
export default function DonutEstado({
  porEstado,
}: {
  porEstado: Record<EstadoGlobal, number>
}) {
  const reduce = usePrefersReducedMotion()
  const total = ORDEN.reduce((s, e) => s + porEstado[e], 0)
  const data = ORDEN.map((e) => ({
    estado: e,
    label: ESTADO_GLOBAL_LABEL[e],
    valor: porEstado[e],
    color: COLOR_ESTADO[e],
  })).filter((d) => d.valor > 0)

  if (total === 0) return <VacioChart>Sin funcionarios para mostrar.</VacioChart>

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
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {fmt(total)}
          </span>
          <span className="text-[11px] text-muted">funcionarios</span>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <li key={d.estado} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: d.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted">{d.label}</span>
            <span className="font-mono tabular-nums text-foreground">{fmt(d.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
