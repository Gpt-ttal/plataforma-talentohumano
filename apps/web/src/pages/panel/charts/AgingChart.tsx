import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { COLOR_AGING } from "@pys/shared"
import type { Aging } from "@pys/shared"
import { ChartTooltip, VacioChart } from "./chartTheme"
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion"

type Esquina = [number, number, number, number]
const PLANO: Esquina = [0, 0, 0, 0]
const IZQ: Esquina = [6, 0, 0, 6]
const DER: Esquina = [0, 6, 6, 0]

const SERIES = [
  { key: "atrasados", label: "Atrasados", color: COLOR_AGING.atrasados },
  { key: "proximos", label: "Próximos (≤ 7 días)", color: COLOR_AGING.proximos },
  { key: "masAdelante", label: "Más adelante", color: COLOR_AGING.masAdelante },
  { key: "sinFecha", label: "Sin fecha", color: COLOR_AGING.sinFecha },
] as const

/**
 * Barra apilada horizontal de la antigüedad del proceso. Una sola fila que
 * compone las cuatro categorías por proporción — distinta del donut de estado
 * (Sección de variedad de layout). Tonos desde `COLOR_AGING` (Semáforo Único).
 */
export default function AgingChart({ aging }: { aging: Aging }) {
  const reduce = usePrefersReducedMotion()
  const total =
    aging.atrasados + aging.proximos + aging.masAdelante + aging.sinFecha

  if (total === 0) return <VacioChart>Sin casos en proceso.</VacioChart>

  const data = [
    {
      name: "aging",
      atrasados: aging.atrasados,
      proximos: aging.proximos,
      masAdelante: aging.masAdelante,
      sinFecha: aging.sinFecha,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={56}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={<ChartTooltip total={total} />}
        />
        {SERIES.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="aging"
            fill={s.color}
            isAnimationActive={!reduce}
            radius={i === 0 ? IZQ : i === SERIES.length - 1 ? DER : PLANO}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
