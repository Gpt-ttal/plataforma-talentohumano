import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { ChartTooltip, VacioChart, coloresChart } from "./chartTheme"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion"
import { useTheme } from "../../../context/ThemeContext"

export interface BarraDato {
  clave: string
  valor: number
}

/** Recorta etiquetas largas del eje para que no desborden la columna. */
function truncar(s: string): string {
  return s.length > 22 ? `${s.slice(0, 21)}…` : s
}

/**
 * Barras horizontales de un desglose (área, cargo u origen). El color es un solo
 * tono navy por barra: las barras comparan magnitud, no codifican estado, así que
 * no consumen el oro ni el semáforo.
 */
export default function BarrasDimension({
  data,
  max = 8,
}: {
  data: BarraDato[]
  max?: number
}) {
  const reduce = usePrefersReducedMotion()
  const { esDark } = useTheme()
  const colores = coloresChart(esDark)
  if (data.length === 0)
    return <VacioChart>Sin datos para esta dimensión.</VacioChart>

  const top = data.slice(0, max)
  const height = Math.max(150, top.length * 40)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={top}
        layout="vertical"
        margin={{ top: 4, right: 20, bottom: 4, left: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={colores.grid} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="clave"
          width={148}
          tick={{ fontSize: 12, fill: colores.ejeTexto }}
          tickFormatter={truncar}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: colores.cursor }}
          content={<ChartTooltip />}
        />
        <Bar
          dataKey="valor"
          fill={colores.barra}
          radius={[0, 6, 6, 0]}
          barSize={16}
          isAnimationActive={!reduce}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
