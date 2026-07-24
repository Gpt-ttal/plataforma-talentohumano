import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { SerieCategoriaVacante } from "@pys/shared"
import { ChartTooltip, VacioChart, coloresChart } from "../../panel/charts/chartTheme"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion"
import { useTheme } from "../../../context/ThemeContext"

/** Etiqueta "YYYY-MM" -> "mmm AAAA" en es-CO. */
function formatMes(yyyyMm: string): string {
  const [anio, mes] = yyyyMm.split("-").map(Number)
  const d = new Date(anio!, (mes ?? 1) - 1, 1)
  return d.toLocaleDateString("es-CO", { month: "short", year: "numeric" }).replace(".", "")
}

/**
 * Contrataciones cerradas por mes — tendencia temporal, distinta de los
 * desgloses categóricos (barras). Un solo tono navy: compara magnitud en el
 * tiempo, no codifica estado.
 */
export default function LineaContratacionesPorMes({
  contratacionesPorMes,
}: {
  contratacionesPorMes: SerieCategoriaVacante[]
}) {
  const reduce = usePrefersReducedMotion()
  const { esDark } = useTheme()
  const colores = coloresChart(esDark)

  if (contratacionesPorMes.length === 0) {
    return <VacioChart>Sin contrataciones registradas.</VacioChart>
  }

  const data = [...contratacionesPorMes]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((s) => ({ mes: formatMes(s.label), valor: s.total }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={colores.grid} strokeDasharray="3 3" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: colores.ejeTexto }} tickLine={false} axisLine={false} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: colores.ejeTexto }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={colores.barra}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          isAnimationActive={!reduce}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
