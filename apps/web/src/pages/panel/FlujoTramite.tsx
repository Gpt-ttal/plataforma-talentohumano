import { Fragment, type ReactNode } from "react"
import { Link } from "react-router-dom"
import type { EstadoGlobal } from "@pys/shared"
import { hrefCon } from "@pys/shared"
import { Icon, type IconName } from "../../components/ui/dash/Icon"
import { Panel } from "../../components/ui/dash/primitives"
import { fmt } from "../../components/ui/dash/format"

/**
 * Flujo del trámite: las 4 etapas del paz y salvo con su conteo. Componente
 * bespoke portado del Resumen (no se sustituye por una gráfica: la secuencia
 * PENDIENTE → PAZ_Y_SALVO es la narrativa del proceso).
 *
 * Los pasos enlazables apuntan a la oficina del rol (`oficina`, vía
 * `rutaOficinaPorRol`) filtrada por estado; así TH no cae en una ruta SA-only.
 */

const FLUJO: {
  estado: EstadoGlobal
  label: ReactNode
  sub: string
  /** Si es enlazable, el href se arma con la oficina del rol + ?estado=. */
  enlazable: boolean
  icon: IconName
}[] = [
  { estado: "PENDIENTE", label: "Pendiente", sub: "Vistos buenos por resolver", enlazable: false, icon: "clock" },
  {
    estado: "LISTO_PARA_LIQUIDAR",
    label: "Listo para liquidar",
    sub: "Relevo a Talento Humano",
    enlazable: true,
    icon: "check",
  },
  {
    estado: "LIQUIDACION_GENERADA",
    label: <>Liquidaci&oacute;n generada</>,
    sub: "Control Interno en curso",
    enlazable: true,
    icon: "file",
  },
  { estado: "PAZ_Y_SALVO", label: "Paz y salvo", sub: "Trámite cerrado", enlazable: false, icon: "check" },
]

const ESTADO_STYLE: Record<
  EstadoGlobal,
  { dot: string; soft: string; line: string; text: string }
> = {
  PENDIENTE: {
    dot: "bg-silver-400",
    soft: "bg-silver-50",
    line: "from-silver-300 to-silver-100",
    text: "text-silver-600",
  },
  LISTO_PARA_LIQUIDAR: {
    dot: "bg-gold-400",
    soft: "bg-gold-50",
    line: "from-gold-300 to-gold-100",
    text: "text-gold-700",
  },
  LIQUIDACION_GENERADA: {
    dot: "bg-estado-info",
    soft: "bg-estado-infoBg",
    line: "from-blue-300 to-blue-100",
    text: "text-estado-info",
  },
  PAZ_Y_SALVO: {
    dot: "bg-estado-ok",
    soft: "bg-estado-okBg",
    line: "from-emerald-300 to-emerald-100",
    text: "text-estado-ok",
  },
}

function WorkflowStep({
  estado,
  label,
  sub,
  value,
  href,
  icon,
}: {
  estado: EstadoGlobal
  label: ReactNode
  sub: string
  value: number
  href?: string
  icon: IconName
}) {
  const style = ESTADO_STYLE[estado]
  const content = (
    <div className="flex h-full flex-col justify-between gap-4 rounded-xl border border-silver-200 bg-white p-4 transition duration-150 group-hover:border-gold-300/70 group-hover:shadow-luxe">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${style.soft} ${style.text}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <span className="text-2xl font-bold tabular-nums text-navy-900">{fmt(value)}</span>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
          <h3 className="text-sm font-semibold text-navy-900">{label}</h3>
        </div>
        <p className="mt-1 text-xs text-silver-600">{sub}</p>
      </div>
    </div>
  )

  if (!href) return <div>{content}</div>
  return (
    <Link to={href} className="group block h-full">
      {content}
    </Link>
  )
}

export function FlujoTramite({
  porEstado,
  oficina,
}: {
  porEstado: Record<EstadoGlobal, number>
  /** Ruta de la oficina del rol actual (`rutaOficinaPorRol`). */
  oficina: string
}) {
  return (
    <Panel
      icon="arrow"
      title="Flujo del trámite"
      right={
        <Link
          to={oficina}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-silver-600 transition hover:text-navy-800"
        >
          Ver catálogo
          <Icon name="arrow" className="h-3.5 w-3.5" />
        </Link>
      }
    >
      <ol className="grid gap-3 lg:grid-cols-4">
        {FLUJO.map((etapa, index) => (
          <Fragment key={etapa.estado}>
            <li className="relative">
              {index > 0 && (
                <span
                  aria-hidden
                  className={`absolute -left-3 top-[2.4rem] hidden h-0.5 w-3 bg-gradient-to-r lg:block ${ESTADO_STYLE[etapa.estado].line}`}
                />
              )}
              <WorkflowStep
                estado={etapa.estado}
                label={etapa.label}
                sub={etapa.sub}
                value={porEstado[etapa.estado]}
                href={etapa.enlazable ? hrefCon(oficina, { estado: etapa.estado }) : undefined}
                icon={etapa.icon}
              />
            </li>
          </Fragment>
        ))}
      </ol>
    </Panel>
  )
}
