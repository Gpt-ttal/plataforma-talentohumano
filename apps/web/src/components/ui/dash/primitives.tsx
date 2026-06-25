import { type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Icon, type IconName } from "./Icon"
import { fmt } from "./format"

/**
 * Primitivas visuales del Panel de control, portadas verbatim de InicioPage y
 * DashboardPage (eran idénticas) a una sola fuente. Respetan el Sello: superficie
 * blanca + hairline silver, oro reservado a hito/acción, números tabulares.
 */

export function CardHeader({
  icon,
  title,
  right,
}: {
  icon: IconName
  title: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-silver-200 bg-silver-50 text-navy-500">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <h2 className="truncate text-sm font-semibold text-navy-900">{title}</h2>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

export function Panel({
  icon,
  title,
  right,
  children,
  className = "",
}: {
  icon: IconName
  title: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-xl border border-silver-200 bg-white/92 p-5 shadow-luxe ${className}`}
    >
      <CardHeader icon={icon} title={title} right={right} />
      {children}
    </section>
  )
}

/**
 * Banda de métricas: una superficie dividida por hairlines (Regla Hairline-
 * Primero) en lugar de tarjetas idénticas. El silver-200 del contenedor asoma por
 * el `gap-px`. La métrica líder manda por tipografía, nunca por oro.
 */
export function MetricBand({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-silver-200 bg-silver-200 shadow-luxe">
      <div className="grid grid-cols-2 gap-px lg:grid-cols-5">{children}</div>
    </section>
  )
}

export function Metric({
  label,
  value,
  sub,
  dot,
  lead = false,
}: {
  label: string
  value: string
  sub: ReactNode
  dot?: string
  lead?: boolean
}) {
  return (
    <article
      className={`flex flex-col gap-1.5 bg-white px-5 py-4 ${
        lead ? "col-span-2 lg:col-span-1" : ""
      }`}
    >
      <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
        {label}
      </p>
      <p
        className={`font-bold leading-none tabular-nums tracking-tight text-navy-900 ${
          lead ? "text-[2rem]" : "text-2xl"
        }`}
      >
        {value}
      </p>
      <p className="text-xs leading-5 text-silver-600">{sub}</p>
    </article>
  )
}

/** Barra horizontal etiqueta + valor, escalada a `max`. */
export function AreaBar({
  nombre,
  valor,
  max,
}: {
  nombre: string
  valor: number
  max: number
}) {
  const width = max > 0 ? (valor / max) * 100 : 0
  return (
    <li className="group flex items-center gap-3 py-1.5">
      <span
        title={nombre}
        className="w-36 shrink-0 truncate text-right text-xs text-silver-600 transition-colors group-hover:text-navy-800"
      >
        {nombre}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-silver-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy-500 to-silver-400 transition-[width] duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs tabular-nums text-silver-600">
        {fmt(valor)}
      </span>
    </li>
  )
}

export function ActionLink({
  to,
  children,
  icon,
  primary,
}: {
  to: string
  children: ReactNode
  icon: IconName
  primary?: boolean
}) {
  return (
    <Link
      to={to}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition-all duration-150 ${
        primary
          ? "bg-navy text-white shadow-luxe hover:bg-navy-600"
          : "border border-silver-200 bg-white/75 text-silver-600 hover:border-gold-300 hover:text-navy-800"
      }`}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </Link>
  )
}

export function ActionButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode
  icon: IconName
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-silver-200 bg-white/75 px-3.5 text-xs font-semibold text-silver-600 transition-all duration-150 hover:border-gold-300 hover:text-navy-800"
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}
