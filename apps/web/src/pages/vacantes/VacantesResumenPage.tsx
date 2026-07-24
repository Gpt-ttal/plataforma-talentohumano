import { Suspense, lazy } from "react"
import type { CatalogoVacanteItem, DashboardVacantes } from "@pys/shared"
import { useVacantesCatalogos, useVacantesDashboard } from "../../hooks/useVacantes"
import { EmptyState } from "../../components/ui/EmptyState"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { Segmented } from "../../components/ui/Segmented"
import { Icon } from "../../components/ui/dash/Icon"
import { Metric, MetricBand, Panel } from "../../components/ui/dash/primitives"
import { fmt } from "../../components/ui/dash/format"

// Gráficas lazy: aíslan Recharts del chunk inicial del SPA (mismo patrón que el Panel de control).
const DonutPorStatus = lazy(() => import("./charts/DonutPorStatus"))
const BarrasPorArea = lazy(() => import("./charts/BarrasPorArea"))
const BarrasPorFase = lazy(() => import("./charts/BarrasPorFase"))
const BarrasPorMotivo = lazy(() => import("./charts/BarrasPorMotivo"))
const BarrasFuentesContratados = lazy(() => import("./charts/BarrasFuentesContratados"))
const LineaContratacionesPorMes = lazy(() => import("./charts/LineaContratacionesPorMes"))

function ChartFallback({ height = "h-56" }: { height?: string }) {
  return <div className={`premium-skeleton rounded-lg ${height} motion-reduce:animate-none`} />
}

function ResumenSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="premium-skeleton h-8 w-72 rounded-xl motion-reduce:animate-none" />
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="premium-skeleton h-20 bg-card motion-reduce:animate-none" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartFallback height="h-64" />
        <ChartFallback height="h-64" />
      </div>
    </div>
  )
}

/**
 * Dashboard de Vacantes (`/vacantes/resumen`): 7 KPIs + 6 series, ruta hermana
 * del listado (payload pesado → carga separada + gráficas lazy, mismo patrón
 * que `PanelControlPage`). Cada gráfica se resuelve en su propio `Suspense`,
 * así una gráfica lenta o en error no tumba el resto del dashboard.
 */
export function VacantesResumenPage() {
  const dashboard = useVacantesDashboard()
  const catalogos = useVacantesCatalogos()

  return (
    <div className="space-y-7">
      <PageHeader
        title="Vacantes · Resumen"
        description="Siete indicadores y seis series del proceso de contratación."
        meta={
          <>
            <span>Gestión Humana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">Procesos de contratación</HeaderMetaDot>
          </>
        }
      />

      <Segmented
        etiqueta="Vista de Vacantes"
        activo="resumen"
        opciones={[
          { value: "listado", label: "Listado", href: "/vacantes" },
          { value: "resumen", label: "Resumen", href: "/vacantes/resumen" },
        ]}
      />

      {dashboard.isLoading ? (
        <ResumenSkeleton />
      ) : dashboard.isError || !dashboard.data ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar el resumen"
          mensaje="Hubo un problema al consultar el dashboard. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : dashboard.data.kpis.totalVacantes === 0 ? (
        <EmptyState
          icono={<Icon name="briefcase" className="h-6 w-6 text-muted" />}
          titulo="Todavía no hay datos que resumir"
          mensaje="Registra la primera vacante desde el listado para ver aquí sus indicadores."
        />
      ) : (
        <Resumen
          dashboard={dashboard.data}
          motivos={catalogos.data?.motivos ?? []}
          fuentes={catalogos.data?.fuentes ?? []}
        />
      )}
    </div>
  )
}

function Resumen({
  dashboard,
  motivos,
  fuentes,
}: {
  dashboard: DashboardVacantes
  motivos: CatalogoVacanteItem[]
  fuentes: CatalogoVacanteItem[]
}) {
  const { kpis, series } = dashboard

  return (
    <div className="space-y-5">
      <MetricBand>
        <Metric lead label="Vacantes" value={fmt(kpis.totalVacantes)} sub="Total de procesos registrados" />
        <Metric label="Cargos únicos" value={fmt(kpis.totalPosiciones)} sub="N.º de cargos distintos" />
        <Metric
          label="Activas"
          value={fmt(kpis.vacantesActivas)}
          sub="En estado pendiente"
          dot="bg-estado-pendiente"
        />
        <Metric
          label="Vencidas"
          value={fmt(kpis.vacantesVencidas)}
          sub="Superaron su fecha de vencimiento"
          dot="bg-estado-rechazo"
        />
        <Metric
          label="Vencidas sin avance"
          value={fmt(kpis.vencidasSinAvance)}
          sub="Vencidas y aún en Reclutamiento"
          dot="bg-gold-400"
        />
        <Metric
          label="Días prom. contratación"
          value={fmt(kpis.diasPromedioContratacion)}
          sub="De requerimiento a contratación"
          dot="bg-estado-info"
        />
        <Metric
          label="Aprobación pendiente"
          value={`${kpis.pctAprobacionPendiente}%`}
          sub="Del total con aprobación registrada"
          dot="bg-estado-ok"
        />
      </MetricBand>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel icon="grid" title="Distribución por status">
          <Suspense fallback={<ChartFallback />}>
            <DonutPorStatus porStatus={series.porStatus} />
          </Suspense>
        </Panel>

        <Panel icon="building" title="Por área / programa">
          <Suspense fallback={<ChartFallback />}>
            <BarrasPorArea porArea={series.porArea} />
          </Suspense>
        </Panel>

        <Panel icon="clock" title="Por fase del proceso">
          <Suspense fallback={<ChartFallback />}>
            <BarrasPorFase porFase={series.porFase} />
          </Suspense>
        </Panel>

        <Panel icon="filter" title="Por motivo">
          <Suspense fallback={<ChartFallback />}>
            <BarrasPorMotivo porMotivo={series.porMotivo} catalogo={motivos} />
          </Suspense>
        </Panel>

        <Panel icon="users" title="Fuentes de los contratados">
          <Suspense fallback={<ChartFallback />}>
            <BarrasFuentesContratados fuentesContratados={series.fuentesContratados} catalogo={fuentes} />
          </Suspense>
        </Panel>

        <Panel icon="calendar" title="Contrataciones por mes">
          <Suspense fallback={<ChartFallback />}>
            <LineaContratacionesPorMes contratacionesPorMes={series.contratacionesPorMes} />
          </Suspense>
        </Panel>
      </div>
    </div>
  )
}
