import { formatFecha, formatMoneda } from "@pys/shared"
import type { CatalogoVacanteItem, VacanteDerivada } from "@pys/shared"
import { Campos, Campo } from "../../components/ui/ficha"
import { Icon } from "../../components/ui/dash/Icon"

/**
 * Bloques de lectura de la ficha de vacante (antes funciones inline en la
 * página dedicada, hoy el modal `VacanteDetalle`). Solo presentación de datos ya
 * cargados; los editores viven en `secciones/`. Cohesivos en un archivo por módulo (YAGNI).
 */

function nombrePorClave(catalogo: CatalogoVacanteItem[] | undefined, clave: string | null): string | null {
  if (!clave || !catalogo) return null
  return catalogo.find((c) => c.clave === clave)?.nombre ?? null
}

// ── Panel de avisos (§3.4 — solo informativo, token semántico `aviso` ámbar) ──

export function PanelAvisosVacante({ avisos }: { avisos: string[] }) {
  return (
    <div className="animate-card-in rounded-xl border border-estado-aviso/30 bg-estado-avisoBg px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-estado-aviso">
        <Icon name="warning" className="h-3.5 w-3.5" />
        Avisos
      </p>
      <ul className="mt-2 space-y-1 text-sm text-estado-aviso">
        {avisos.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </div>
  )
}

// ── Bloques de lectura ───────────────────────────────────────────────────────

export function BloqueSolicitud({
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

export function BloqueReclutamiento({
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

export function BloqueAprobacion({ vacante: v }: { vacante: VacanteDerivada }) {
  return (
    <Campos>
      <Campo etiqueta="Fecha de aprobación" valor={formatFecha(v.fechaAprobacion)} />
    </Campos>
  )
}

export function BloqueCierre({ vacante: v }: { vacante: VacanteDerivada }) {
  return (
    <Campos>
      <Campo etiqueta="Cédula" valor={v.cedula} />
      <Campo etiqueta="Fecha de contratación" valor={formatFecha(v.fechaContratacion)} />
    </Campos>
  )
}
