import { Link } from "react-router-dom"

/**
 * ChipFiltro — chip de filtro server-driven por la URL (un `Link` que ajusta la
 * query). El padre construye el `href` (set/clear del filtro + reset de página);
 * el activo lo decide quien renderiza, no estado local.
 */
export function ChipFiltro({
  label,
  activo,
  href,
  contador,
}: {
  label: string
  activo: boolean
  href: string
  contador?: number
}) {
  return (
    <Link
      to={href}
      aria-pressed={activo}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
        activo
          ? "bg-navy-deep text-white shadow-luxe ring-1 ring-gold/45"
          : "bg-white/82 text-silver-600 ring-1 ring-silver-200 hover:bg-white hover:text-navy-800 hover:ring-gold-300"
      }`}
    >
      {label}
      {contador !== undefined && (
        <span className={`tabular-nums ${activo ? "text-gold-200" : "text-silver-600"}`}>
          {contador}
        </span>
      )}
    </Link>
  )
}
