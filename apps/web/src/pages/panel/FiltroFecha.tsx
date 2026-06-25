export interface RangoFecha {
  desde: string
  hasta: string
}

/**
 * Filtro por rango de fecha de retiro. Dos `<input type="date">` etiquetados
 * (label asociado) + botón "Limpiar" cuando hay rango activo. Recalcula los
 * totalizadores y las gráficas derivadas (no las "pendientes por área", global).
 */
export function FiltroFecha({
  rango,
  onChange,
}: {
  rango: RangoFecha
  onChange: (next: RangoFecha) => void
}) {
  const activo = Boolean(rango.desde || rango.hasta)
  const inputClass =
    "h-8 rounded-md border border-silver-200 bg-white px-2 text-xs text-navy-900 shadow-sm transition focus:border-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-300/40"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-silver-600">
        Retiro
      </span>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Fecha de retiro desde</span>
        <input
          type="date"
          value={rango.desde}
          max={rango.hasta || undefined}
          onChange={(e) => onChange({ ...rango, desde: e.target.value })}
          className={inputClass}
          aria-label="Fecha de retiro desde"
        />
      </label>
      <span className="text-xs text-silver-600">a</span>
      <label className="flex items-center gap-1.5">
        <span className="sr-only">Fecha de retiro hasta</span>
        <input
          type="date"
          value={rango.hasta}
          min={rango.desde || undefined}
          onChange={(e) => onChange({ ...rango, hasta: e.target.value })}
          className={inputClass}
          aria-label="Fecha de retiro hasta"
        />
      </label>
      {activo && (
        <button
          type="button"
          onClick={() => onChange({ desde: "", hasta: "" })}
          className="rounded-md px-2 py-1 text-xs font-semibold text-silver-600 transition hover:text-navy-800"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}
