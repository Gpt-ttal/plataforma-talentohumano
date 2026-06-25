/**
 * SegmentedLocal — control segmentado con estado en cliente (a diferencia de
 * `Segmented`, que navega por URL). Para alternar la dimensión de un desglose
 * dentro del Panel sin recargar ni cambiar de ruta. Accesible por teclado
 * (botones nativos + `role="tablist"`).
 */
export interface OpcionLocal<T extends string> {
  value: T
  label: string
}

export function SegmentedLocal<T extends string>({
  opciones,
  activo,
  onChange,
  etiqueta,
}: {
  opciones: OpcionLocal<T>[]
  activo: T
  onChange: (value: T) => void
  etiqueta?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className="inline-flex items-center gap-1 rounded-lg border border-silver-200 bg-white/70 p-1 shadow-luxe"
    >
      {opciones.map((o) => {
        const sel = o.value === activo
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={sel}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
              sel
                ? "bg-navy-deep text-white shadow-luxe ring-1 ring-gold/35"
                : "text-silver-600 hover:bg-white hover:text-navy-800"
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
