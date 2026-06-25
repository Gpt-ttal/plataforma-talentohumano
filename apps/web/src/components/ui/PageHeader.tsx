import type { ReactNode } from "react"

/**
 * Encabezado de página. Título en serif (`.font-display`), descripción/meta en
 * sans, acciones a la derecha. Sin eyebrow (prohibido por el design system).
 */
export function PageHeader({
  title,
  description,
  meta,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="animate-card-in flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-navy-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-silver-600">
            {description}
          </p>
        )}
        {meta && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-silver-600">
            {meta}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function HeaderMetaDot({
  children,
  tone = "ok",
}: {
  children: ReactNode
  tone?: "ok" | "gold" | "info"
}) {
  const toneClass = {
    ok: "bg-estado-ok shadow-[0_0_0_4px_rgba(22,147,106,0.12)]",
    gold: "bg-gold-400 shadow-[0_0_0_4px_rgba(182,141,64,0.14)]",
    info: "bg-estado-info shadow-[0_0_0_4px_rgba(59,111,212,0.12)]",
  }[tone]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${toneClass}`} />
      {children}
    </span>
  )
}
