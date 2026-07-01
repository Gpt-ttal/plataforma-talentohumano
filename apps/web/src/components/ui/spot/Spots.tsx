/**
 * Spots — ilustraciones de estado vacío (spot illustrations) en el Sello.
 *
 * SVG inline ~120px, trazo de línea navy con un acento de oro (≤10%), coherentes
 * con `Icon`. Decorativas (`aria-hidden`); el `EmptyState` aporta el texto. El navy
 * usa `currentColor` (heredado de `text-navy-800`), el oro va literal.
 */

const ORO = "#B68D40"
const SILVER = "#CCD2DE"

function Lienzo({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-foreground"
    >
      {children}
    </svg>
  )
}

/** Lupa con destello — para búsquedas/filtros sin coincidencias. */
export function SpotSinResultados() {
  return (
    <Lienzo>
      <circle cx="54" cy="52" r="26" />
      <path d="M74 72l20 20" />
      <path d="M44 52h20M54 42v20" stroke={SILVER} />
      <path d="M88 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" stroke={ORO} />
    </Lienzo>
  )
}

/** Archivador/cajón — para el archivo institucional sin trámites cerrados. */
export function SpotArchivoVacio() {
  return (
    <Lienzo>
      <path d="M22 38h76v14H22z" />
      <path d="M28 52v44a4 4 0 0 0 4 4h56a4 4 0 0 0 4-4V52" />
      <path d="M50 66h20" stroke={ORO} />
      <path d="M40 80h40M40 90h28" stroke={SILVER} />
    </Lienzo>
  )
}

/** Bandeja con visto bueno — cola al día / sin pendientes. */
export function SpotBandejaAlDia() {
  return (
    <Lienzo>
      <rect x="24" y="52" width="72" height="44" rx="8" />
      <path d="M24 66h20l6 10h20l6-10h20" />
      <path d="M46 40h28l7 16H39l7-16Z" stroke={SILVER} />
      <path d="M52 30l5 5 9-11" stroke={ORO} />
    </Lienzo>
  )
}
