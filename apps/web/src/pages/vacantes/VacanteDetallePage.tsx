import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { formatFecha, formatMoneda } from "@pys/shared"
import type { CatalogoVacanteItem, VacanteDerivada } from "@pys/shared"
import { useVacanteDetalle, useVacantesCatalogos } from "../../hooks/useVacantes"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Icon } from "../../components/ui/dash/Icon"
import type { IconName } from "../../components/ui/dash/Icon"
import {
  AprobacionVacantePill,
  EstadoCapturadoVacantePill,
  EstadoVacantePill,
  FaseVacantePill,
} from "../../components/ui/VacantePills"
import { AccionesVacante } from "./AccionesVacante"
import { SolicitudEditor } from "./secciones/SolicitudEditor"
import { ReclutamientoEditor } from "./secciones/ReclutamientoEditor"
import { AprobacionEditor } from "./secciones/AprobacionEditor"
import { CierreEditor } from "./secciones/CierreEditor"

/**
 * Detalle de una vacante (`/vacantes/:id`, página propia — mismo patrón que
 * `ExpedientePage`): header pegajoso con identidad + navegación por secciones,
 * una sección por bloque conceptual (Avance, Solicitud, Reclutamiento,
 * Aprobación, y Cierre si ya está contratado).
 */
export function VacanteDetallePage() {
  const { id } = useParams()
  const { data, isLoading, isError } = useVacanteDetalle(id)

  return (
    <div className="space-y-6">
      <Link
        to="/vacantes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-silver-600 transition-colors hover:text-navy-700 dark:hover:text-foreground"
      >
        <Icon name="arrow" className="h-4 w-4 rotate-180" />
        Volver a Vacantes
      </Link>

      {isLoading ? (
        <ListaSkeleton filas={6} />
      ) : isError || !data ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar la vacante"
          mensaje="Hubo un problema al consultar el proceso. Revisa tu conexión e inténtalo de nuevo, o vuelve al listado si el enlace ya no existe."
        />
      ) : (
        <VacanteDetalle vacante={data} />
      )}
    </div>
  )
}

const SECCIONES_BASE = [
  { id: "avance", label: "Avance" },
  { id: "solicitud", label: "Solicitud" },
  { id: "reclutamiento", label: "Reclutamiento" },
  { id: "aprobacion", label: "Aprobación" },
] as const

function VacanteDetalle({ vacante: v }: { vacante: VacanteDerivada }) {
  const catalogos = useVacantesCatalogos()
  const areaNombre = v.areaId ? (catalogos.data?.areas.find((a) => a.id === v.areaId)?.nombre ?? null) : null
  const cerrado = v.estado === "CONTRATADO"
  const secciones = cerrado ? [...SECCIONES_BASE, { id: "cierre", label: "Cierre" } as const] : SECCIONES_BASE

  return (
    <div className="space-y-6">
      {/* Header pegajoso: identidad + navegación por secciones */}
      <header className="premium-card sticky top-2 z-20 rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 ring-1 ring-navy-200 dark:bg-surface-2 dark:ring-border">
            <Icon name="briefcase" className="h-5 w-5 text-navy-700 dark:text-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-foreground">
              {v.cargo}
            </h1>
            <p className="mt-0.5 text-sm tabular-nums text-silver-600">
              {v.posiciones} posición{v.posiciones === 1 ? "" : "es"}
              {areaNombre ? ` · ${areaNombre}` : ""}
              {v.requerimiento ? ` · N.º ${v.requerimiento}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {v.status && <EstadoVacantePill status={v.status} />}
              <EstadoCapturadoVacantePill estado={v.estado} />
              <FaseVacantePill fase={v.fase} />
              {v.aprobacion && <AprobacionVacantePill aprobacion={v.aprobacion} />}
            </div>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-silver-200 pt-3 dark:border-border">
          {secciones.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full px-3 py-1 text-xs font-medium text-silver-600 transition-colors hover:bg-navy-50 hover:text-navy-700 dark:hover:bg-surface-2 dark:hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Panel de avisos agregado (v1) — no se monta si no hay avisos (§3.4). */}
      {v.avisos.length > 0 && <PanelAvisosVacante avisos={v.avisos.map((a) => a.mensaje)} />}

      <Seccion id="avance" titulo="Avance del proceso" icono="clock">
        <AccionesVacante vacante={v} />
      </Seccion>

      <Seccion id="solicitud" titulo="Solicitud" icono="file">
        <BloqueSolicitud vacante={v} areaNombre={areaNombre} motivo={catalogos.data?.motivos} />
        <SolicitudEditor vacante={v} />
      </Seccion>

      <Seccion id="reclutamiento" titulo="Reclutamiento" icono="search">
        <BloqueReclutamiento vacante={v} catalogos={catalogos.data} />
        <ReclutamientoEditor vacante={v} />
      </Seccion>

      <Seccion id="aprobacion" titulo="Aprobación presupuestal" icono="coins">
        <BloqueAprobacion vacante={v} />
        <AprobacionEditor vacante={v} />
      </Seccion>

      {cerrado && (
        <Seccion id="cierre" titulo="Cierre del proceso" icono="check">
          <BloqueCierre vacante={v} />
          <CierreEditor vacante={v} />
        </Seccion>
      )}
    </div>
  )
}

// ── Panel de avisos (§3.4 — solo informativo, tono gold/ámbar) ───────────────

function PanelAvisosVacante({ avisos }: { avisos: string[] }) {
  return (
    <div className="animate-card-in rounded-xl border border-gold-300/60 bg-gold-50/70 px-4 py-3 dark:border-gold-300/25 dark:bg-surface-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-700">
        <Icon name="warning" className="h-3.5 w-3.5" />
        Avisos
      </p>
      <ul className="mt-2 space-y-1 text-sm text-gold-800 dark:text-foreground">
        {avisos.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </div>
  )
}

// ── Contenedor de sección ─────────────────────────────────────────────────

function Seccion({
  id,
  titulo,
  icono,
  children,
}: {
  id: string
  titulo: string
  icono: IconName
  children: ReactNode
}) {
  return (
    <section id={id} className="premium-card scroll-mt-40 rounded-2xl px-5 py-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-navy-800 dark:text-foreground">
        <Icon name={icono} className="h-4 w-4 text-gold-500" />
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Rejilla de datos etiqueta/valor (label micro-uppercase + valor tabular). */
function Campos({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm md:grid-cols-3">{children}</dl>
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-silver-600">{etiqueta}</dt>
      <dd className="mt-0.5 break-words font-medium text-navy-700 tabular-nums dark:text-foreground">
        {valor || "—"}
      </dd>
    </div>
  )
}

function nombrePorClave(catalogo: CatalogoVacanteItem[] | undefined, clave: string | null): string | null {
  if (!clave || !catalogo) return null
  return catalogo.find((c) => c.clave === clave)?.nombre ?? null
}

// ── Bloques de lectura ───────────────────────────────────────────────────

function BloqueSolicitud({
  vacante: v,
  areaNombre,
  motivo,
}: {
  vacante: VacanteDerivada
  areaNombre: string | null
  motivo: CatalogoVacanteItem[] | undefined
}) {
  return (
    <Campos>
      <Campo etiqueta="Cargo" valor={v.cargo} />
      <Campo etiqueta="N.º de posiciones" valor={v.posiciones} />
      <Campo etiqueta="Área / programa" valor={areaNombre} />
      <Campo etiqueta="Jefe inmediato" valor={v.jefe} />
      <Campo etiqueta="Reemplazo de" valor={v.reemplazo} />
      <Campo etiqueta="Candidato / nuevo empleado" valor={v.nombreNuevo} />
      <Campo etiqueta="Motivo" valor={nombrePorClave(motivo, v.motivo)} />
      <Campo etiqueta="Fecha de requerimiento" valor={formatFecha(v.fechaRequerimiento)} />
      <Campo etiqueta="Fecha de vencimiento" valor={formatFecha(v.fechaVencimiento)} />
    </Campos>
  )
}

function BloqueReclutamiento({
  vacante: v,
  catalogos,
}: {
  vacante: VacanteDerivada
  catalogos:
    | {
        modalidades: CatalogoVacanteItem[]
        dedicaciones: CatalogoVacanteItem[]
        escalafones: CatalogoVacanteItem[]
        fuentes: CatalogoVacanteItem[]
      }
    | undefined
}) {
  return (
    <Campos>
      <Campo etiqueta="Modalidad" valor={nombrePorClave(catalogos?.modalidades, v.modalidad)} />
      <Campo etiqueta="Dedicación" valor={nombrePorClave(catalogos?.dedicaciones, v.dedicacion)} />
      <Campo etiqueta="Escalafón" valor={nombrePorClave(catalogos?.escalafones, v.escalafon)} />
      <Campo etiqueta="Fuente de reclutamiento" valor={nombrePorClave(catalogos?.fuentes, v.fuente)} />
      <Campo etiqueta="Salario" valor={formatMoneda(v.salario)} />
      <Campo etiqueta="Días en proceso" valor={v.diasEnProceso} />
    </Campos>
  )
}

function BloqueAprobacion({ vacante: v }: { vacante: VacanteDerivada }) {
  return (
    <Campos>
      <Campo etiqueta="Fecha de aprobación" valor={formatFecha(v.fechaAprobacion)} />
    </Campos>
  )
}

function BloqueCierre({ vacante: v }: { vacante: VacanteDerivada }) {
  return (
    <Campos>
      <Campo etiqueta="Cédula" valor={v.cedula} />
      <Campo etiqueta="Fecha de contratación" valor={formatFecha(v.fechaContratacion)} />
    </Campos>
  )
}
