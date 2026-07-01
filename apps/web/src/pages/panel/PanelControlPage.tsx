import { Suspense, lazy, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { EstadoGlobal, RolUsuario } from "@pys/shared"
import {
  agregarPorEstado,
  agruparPorCampo,
  calcularAging,
  filtrarPorRangoRetiro,
  formatFecha,
  hrefCon,
  rutaOficinaPorRol,
} from "@pys/shared"
import { useAuth } from "../../context/AuthContext"
import { useRole } from "../../hooks/useRole"
import { useMetricas } from "../../hooks/useMetricas"
import { useFuncionariosTodos } from "../../hooks/useFuncionariosTodos"
import { Icon } from "../../components/ui/dash/Icon"
import {
  ActionButton,
  ActionLink,
  AreaBar,
  Metric,
  MetricBand,
  Panel,
} from "../../components/ui/dash/primitives"
import { SegmentedLocal } from "../../components/ui/dash/SegmentedLocal"
import { fmt, formatDate, getGreeting, maxValue, pct } from "../../components/ui/dash/format"
import { ModuleLauncher } from "./ModuleLauncher"
import { FlujoTramite } from "./FlujoTramite"
import { FiltroFecha, type RangoFecha } from "./FiltroFecha"

// Gráficas lazy: aíslan Recharts del chunk inicial del SPA.
const DonutEstado = lazy(() => import("./charts/DonutEstado"))
const BarrasDimension = lazy(() => import("./charts/BarrasDimension"))
const AgingChart = lazy(() => import("./charts/AgingChart"))

type Dimension = "cargo" | "origen"

const AGING_FILAS = [
  { key: "atrasados", label: "Atrasados", tone: "bg-estado-rechazo" },
  { key: "proximos", label: "Próximos (≤ 7 días)", tone: "bg-gold-400" },
  { key: "masAdelante", label: "Más adelante", tone: "bg-navy-500" },
  { key: "sinFecha", label: "Sin fecha", tone: "bg-faint" },
] as const

function ChartFallback({ height = "h-56" }: { height?: string }) {
  return <div className={`premium-skeleton rounded-lg ${height} motion-reduce:animate-none`} />
}

function AgingRow({
  label,
  value,
  total,
  tone,
}: {
  label: string
  value: number
  total: number
  tone: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone}`} />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className="font-mono text-xs text-muted">{pct(value, total)}</span>
      <span className="w-8 text-right text-sm font-semibold tabular-nums text-foreground">
        {fmt(value)}
      </span>
    </li>
  )
}

/** "Qué resolver hoy" — callout accionable, role-aware, desde las cifras canónicas. */
function ResolverHoy({
  esSuperadmin,
  oficina,
  atrasados,
  listosParaLiquidar,
}: {
  esSuperadmin: boolean
  /** Ruta de la oficina del rol actual (`rutaOficinaPorRol`). */
  oficina: string
  atrasados: number
  listosParaLiquidar: number
}) {
  if (esSuperadmin) {
    return (
      <Panel icon="grid" title="Qué resolver hoy">
        <Link
          to={hrefCon(oficina, { estado: "PENDIENTE" })}
          className="group flex items-center gap-4 rounded-xl border border-border bg-gradient-to-r from-estado-listoBg to-card px-4 py-3 ring-1 ring-gold-300/50 transition hover:shadow-luxe"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-sheen text-navy-900">
            <Icon name="clock" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">
              {atrasados === 0
                ? "Sin retiros atrasados"
                : `${fmt(atrasados)} retiro${atrasados === 1 ? "" : "s"} atrasado${atrasados === 1 ? "" : "s"}`}
            </span>
            <span className="block text-xs text-muted">
              {atrasados === 0
                ? "El proceso está al día con las fechas de retiro."
                : "Su fecha de retiro ya pasó y el trámite sigue pendiente."}
            </span>
          </span>
          <Icon
            name="arrow"
            className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-gold-600"
          />
        </Link>
      </Panel>
    )
  }

  return (
    <Panel icon="check" title="Qué resolver hoy">
      <Link
        to={hrefCon(oficina, { estado: "LISTO_PARA_LIQUIDAR" })}
        className="group flex items-center gap-4 rounded-xl border border-border bg-gradient-to-r from-estado-listoBg to-card px-4 py-3 ring-1 ring-gold-300/50 transition hover:shadow-luxe"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gold-sheen text-lg font-bold tabular-nums text-navy-900">
          {fmt(listosParaLiquidar)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {listosParaLiquidar === 0
              ? "Nada por liquidar por ahora"
              : `Listo${listosParaLiquidar === 1 ? "" : "s"} para generar liquidación`}
          </span>
          <span className="block text-xs text-muted">
            {listosParaLiquidar === 0
              ? "Ningún colaborador tiene todas sus áreas en visto bueno."
              : `${fmt(listosParaLiquidar)} colaborador${listosParaLiquidar === 1 ? "" : "es"} con todas las áreas OK.`}
          </span>
        </span>
        <Icon
          name="arrow"
          className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-gold-600"
        />
      </Link>
    </Panel>
  )
}

function PanelHeader({
  firstName,
  esSuperadmin,
  oficina,
  onRefetch,
}: {
  firstName: string
  esSuperadmin: boolean
  /** Ruta de la oficina del rol actual (`rutaOficinaPorRol`). */
  oficina: string
  onRefetch: () => void
}) {
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted">
          {formatDate()}
        </p>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground">
          {getGreeting()}, <span className="text-gold-600">{firstName}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Panel de control · Corporación Universitaria Americana. Módulos, métricas del
          trámite y lo urgente del día en una sola vista.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ActionButton icon="refresh" onClick={onRefetch}>
          Actualizar
        </ActionButton>
        {esSuperadmin && (
          <ActionLink to="/usuarios" icon="users">
            Usuarios
          </ActionLink>
        )}
        <ActionLink to={oficina} icon="file" primary>
          Funcionarios
        </ActionLink>
      </div>
    </header>
  )
}

function ErrorPanel({
  firstName,
  rol,
  esSuperadmin,
  oficina,
  onRefetch,
}: {
  firstName: string
  rol: RolUsuario
  esSuperadmin: boolean
  oficina: string
  onRefetch: () => void
}) {
  return (
    <div className="space-y-5">
      <PanelHeader
        firstName={firstName}
        esSuperadmin={esSuperadmin}
        oficina={oficina}
        onRefetch={onRefetch}
      />
      <ModuleLauncher rol={rol} />
      <div className="rounded-xl border border-estado-rechazo/30 bg-estado-rechazoBg px-4 py-3 text-sm text-estado-rechazo">
        No se pudieron cargar las métricas del trámite.
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="space-y-2">
        <div className="premium-skeleton h-3 w-48 rounded motion-reduce:animate-none" />
        <div className="premium-skeleton h-8 w-72 rounded-xl motion-reduce:animate-none" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ChartFallback height="h-16" />
        <ChartFallback height="h-16" />
        <ChartFallback height="h-16" />
      </div>
      <ChartFallback height="h-24" />
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <ChartFallback height="h-72" />
        </div>
        <div className="xl:col-span-3">
          <ChartFallback height="h-72" />
        </div>
      </div>
    </div>
  )
}

export function PanelControlPage() {
  const { usuario } = useAuth()
  const { rol, esSuperadmin } = useRole()
  const metricasQ = useMetricas()
  const todosQ = useFuncionariosTodos()

  const [dimension, setDimension] = useState<Dimension>("cargo")
  const [rango, setRango] = useState<RangoFecha>({ desde: "", hasta: "" })

  const firstName = usuario?.nombre?.split(/\s+/)[0] ?? "Usuario"
  // Oficina del rol (el Panel solo lo ven SA y TH): los enlaces nunca apuntan a
  // /paz-y-salvo/funcionarios (SA-only) para que TH no caiga en /no-access.
  const rolEfectivo: RolUsuario = rol ?? "SUPERADMIN"
  const oficina = rutaOficinaPorRol(rolEfectivo)
  const refetchAll = () => {
    void metricasQ.refetch()
    void todosQ.refetch()
  }

  const lista = useMemo(() => todosQ.data ?? [], [todosQ.data])
  const hayFiltro = Boolean(rango.desde || rango.hasta)
  const listaFiltrada = useMemo(
    () => filtrarPorRangoRetiro(lista, rango.desde || undefined, rango.hasta || undefined),
    [lista, rango],
  )
  const listaDesglose = hayFiltro ? listaFiltrada : lista
  const dimensionData = useMemo(
    () => agruparPorCampo(listaDesglose, dimension === "cargo" ? "cargo" : "areaOrigen"),
    [listaDesglose, dimension],
  )

  if (metricasQ.isLoading) return <PanelSkeleton />
  if (metricasQ.isError || !metricasQ.data) {
    return (
      <ErrorPanel
        firstName={firstName}
        rol={rolEfectivo}
        esSuperadmin={esSuperadmin}
        oficina={oficina}
        onRefetch={refetchAll}
      />
    )
  }

  const m = metricasQ.data

  // Cifras canónicas (sin filtro) vs derivadas de la lista (con filtro de fecha).
  const porEstado: Record<EstadoGlobal, number> = hayFiltro
    ? agregarPorEstado(listaFiltrada)
    : m.porEstado
  const aging = hayFiltro ? calcularAging(listaFiltrada) : m.aging
  const total = hayFiltro ? listaFiltrada.length : m.totalFuncionarios

  const cerrados = porEstado.PAZ_Y_SALVO
  const enProceso = total - cerrados
  const riesgo = aging.atrasados + aging.proximos
  const agingTotal = aging.atrasados + aging.proximos + aging.masAdelante + aging.sinFecha
  const pendientesAreaTotal = m.pendientesPorArea.reduce((s, a) => s + a.pendientes, 0)

  const maxPend = maxValue(m.pendientesPorArea.map((p) => p.pendientes))
  const topAreas = m.pendientesPorArea.slice(0, 7)

  return (
    <div className="space-y-5">
      <PanelHeader
        firstName={firstName}
        esSuperadmin={esSuperadmin}
        oficina={oficina}
        onRefetch={refetchAll}
      />

      <ModuleLauncher rol={rolEfectivo} />

      {/* Controles: filtro por fecha de retiro (lente sobre la población). */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/75 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <FiltroFecha rango={rango} onChange={setRango} />
        {hayFiltro && (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
            Retiro: {rango.desde ? formatFecha(rango.desde) : "inicio"} a{" "}
            {rango.hasta ? formatFecha(rango.hasta) : "hoy"} · {fmt(total)} funcionario
            {total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Totalizadores */}
      <MetricBand>
        <Metric
          lead
          label="Funcionarios"
          value={fmt(total)}
          sub={hayFiltro ? "En el rango de retiro" : "Total en el proceso de retiro"}
        />
        <Metric
          label="En proceso"
          value={fmt(enProceso)}
          sub={`${pct(enProceso, total)} aún requiere gestión`}
          dot="bg-estado-info"
        />
        <Metric
          label="Pendientes área"
          value={fmt(pendientesAreaTotal)}
          sub="Vistos buenos por resolver (global)"
          dot="bg-estado-rechazo"
        />
        <Metric
          label="Riesgo retiro"
          value={fmt(riesgo)}
          sub="Atrasados o próximos a retiro"
          dot="bg-gold-400"
        />
        <Metric
          label="Cerrados"
          value={fmt(cerrados)}
          sub={`${pct(cerrados, total)} con paz y salvo`}
          dot="bg-estado-ok"
        />
      </MetricBand>

      {/* Gráficas: distribución por estado + desglose segmentable */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel icon="grid" title="Distribución por estado" className="xl:col-span-2">
          <Suspense fallback={<ChartFallback />}>
            <DonutEstado porEstado={porEstado} />
          </Suspense>
        </Panel>

        <Panel
          icon="users"
          title="Funcionarios por dimensión"
          className="xl:col-span-3"
          right={
            <SegmentedLocal<Dimension>
              etiqueta="Dimensión del desglose"
              activo={dimension}
              onChange={setDimension}
              opciones={[
                { value: "cargo", label: "Cargo" },
                { value: "origen", label: "Área de origen" },
              ]}
            />
          }
        >
          {todosQ.isLoading ? (
            <ChartFallback />
          ) : (
            <Suspense fallback={<ChartFallback />}>
              <BarrasDimension data={dimensionData} />
            </Suspense>
          )}
        </Panel>
      </div>

      {/* Antigüedad del proceso: barra apilada + desglose textual */}
      <Panel
        icon="clock"
        title="Antigüedad del proceso"
        right={<span className="font-mono text-[10px] text-muted">{fmt(agingTotal)} casos</span>}
      >
        <div className="mb-4">
          <Suspense fallback={<ChartFallback height="h-14" />}>
            <AgingChart aging={aging} />
          </Suspense>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {AGING_FILAS.map((f) => (
            <AgingRow
              key={f.key}
              label={f.label}
              value={aging[f.key]}
              total={agingTotal}
              tone={f.tone}
            />
          ))}
        </ul>
      </Panel>

      <FlujoTramite porEstado={porEstado} oficina={oficina} />

      {/* Carga de trabajo por dependencia (global) + qué resolver hoy */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        <Panel
          icon="grid"
          title="Pendientes por área"
          className="xl:col-span-3"
          right={
            m.pendientesPorArea.length > 7 ? (
              <span className="font-mono text-[10px] text-muted">
                Top 7 de {m.pendientesPorArea.length}
              </span>
            ) : undefined
          }
        >
          <p className="mb-3 text-xs text-muted">
            Vistos buenos aún sin resolver por dependencia (vista global, no afectada por el
            filtro de fecha).
          </p>
          {topAreas.length === 0 ? (
            <div className="rounded-lg bg-surface-2 px-4 py-8 text-center text-sm text-muted">
              Sin pendientes por área.
            </div>
          ) : (
            <ul className="space-y-0">
              {topAreas.map((p) => (
                <AreaBar key={p.areaId} nombre={p.areaNombre} valor={p.pendientes} max={maxPend} />
              ))}
            </ul>
          )}
        </Panel>

        <div className="xl:col-span-2">
          <ResolverHoy
            esSuperadmin={esSuperadmin}
            oficina={oficina}
            atrasados={m.aging.atrasados}
            listosParaLiquidar={m.porEstado.LISTO_PARA_LIQUIDAR}
          />
        </div>
      </div>
    </div>
  )
}
