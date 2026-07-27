import type { VacanteDerivada } from "@pys/shared"
import { useVacantesCatalogos } from "../../hooks/useVacantes"
import { DetalleModalLayout, Seccion } from "../../components/ui/ficha"
import type { SeccionNav } from "../../components/ui/ficha"
import { Icon } from "../../components/ui/dash/Icon"
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
import {
  BloqueAprobacion,
  BloqueCierre,
  BloqueReclutamiento,
  BloqueSolicitud,
  PanelAvisosVacante,
} from "./VacanteBloques"

const SECCIONES_BASE: readonly SeccionNav[] = [
  { id: "avance", label: "Avance" },
  { id: "solicitud", label: "Solicitud" },
  { id: "reclutamiento", label: "Reclutamiento" },
  { id: "aprobacion", label: "Aprobación" },
]

/**
 * Ficha completa de una vacante dentro del modal. Orquestador delgado: compone
 * el layout compartido (identidad + nav pegajosos) con las secciones (Avance,
 * Solicitud, Reclutamiento, Aprobación, y Cierre si ya está contratado), cada una
 * con su bloque de lectura + editor. Los datos llegan ya cargados desde el wrapper.
 */
export function VacanteDetalle({ vacante: v }: { vacante: VacanteDerivada }) {
  const catalogos = useVacantesCatalogos()
  const areaNombre = v.areaId
    ? (catalogos.data?.areas.find((a) => a.id === v.areaId)?.nombre ?? null)
    : null
  const cerrado = v.estado === "CONTRATADO"
  const secciones = cerrado
    ? [...SECCIONES_BASE, { id: "cierre", label: "Cierre" }]
    : SECCIONES_BASE

  return (
    <DetalleModalLayout secciones={secciones} identidad={<IdentidadVacante vacante={v} areaNombre={areaNombre} />}>
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
    </DetalleModalLayout>
  )
}

/** Encabezado de identidad: icono + cargo + meta + los 4 pills (Semáforo Único). */
function IdentidadVacante({
  vacante: v,
  areaNombre,
}: {
  vacante: VacanteDerivada
  areaNombre: string | null
}) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-50 ring-1 ring-navy-200 dark:bg-surface-2 dark:ring-border">
        <Icon name="briefcase" className="h-5 w-5 text-navy-700 dark:text-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <h1
          id="titulo-vacante-detalle"
          className="font-display text-2xl font-semibold text-navy-900 dark:text-foreground"
        >
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
  )
}
