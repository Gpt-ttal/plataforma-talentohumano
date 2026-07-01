import { Icon } from "./dash/Icon"

/**
 * TimeField — selector de hora elegante en el Sello. Reemplaza la entrada libre
 * de `datetime-local`: hora (01–12) + minutos (paso 5) en selects de apariencia
 * limpia, y un toggle segmentado a. m. / p. m. (navy activo). El valor se modela
 * como `"HH:MM"` en formato 24 h para componer luego la fecha-hora ISO.
 */

const HORAS_12 = Array.from({ length: 12 }, (_, i) => i + 1) // 1..12
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5) // 0,5,…,55

type Periodo = "AM" | "PM"

/** Descompone "HH:MM" (24 h) en hora de 12 h, minutos y periodo. */
function descomponer(valor: string): { h12: number; m: number; periodo: Periodo } {
  const [hStr, mStr] = valor.split(":")
  const h24 = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h24) || Number.isNaN(m)) return { h12: 8, m: 0, periodo: "AM" }
  const periodo: Periodo = h24 >= 12 ? "PM" : "AM"
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return { h12, m, periodo }
}

/** Compone "HH:MM" (24 h) desde hora de 12 h, minutos y periodo. */
function componer(h12: number, m: number, periodo: Periodo): string {
  let h24 = h12 % 12
  if (periodo === "PM") h24 += 12
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const selCls =
  "appearance-none bg-transparent px-1 py-2 text-sm font-semibold tabular-nums text-foreground focus:outline-none disabled:opacity-50 cursor-pointer"

export function TimeField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (valor: string) => void
  disabled?: boolean
}) {
  const { h12, m, periodo } = descomponer(value)
  const set = (nh: number, nm: number, np: Periodo) => onChange(componer(nh, nm, np))

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card pl-2.5 pr-1 transition focus-within:border-gold-400 focus-within:ring-1 focus-within:ring-gold-400">
      <Icon name="clock" className="h-3.5 w-3.5 shrink-0 text-faint" />
      <select
        aria-label="Hora"
        value={h12}
        disabled={disabled}
        onChange={(e) => set(Number(e.target.value), m, periodo)}
        className={selCls}
      >
        {HORAS_12.map((h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="text-faint">:</span>
      <select
        aria-label="Minutos"
        value={m}
        disabled={disabled}
        onChange={(e) => set(h12, Number(e.target.value), periodo)}
        className={selCls}
      >
        {MINUTOS.map((mm) => (
          <option key={mm} value={mm}>
            {String(mm).padStart(2, "0")}
          </option>
        ))}
      </select>
      <span className="ml-1 inline-flex overflow-hidden rounded-md ring-1 ring-border">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            aria-pressed={periodo === p}
            onClick={() => set(h12, m, p)}
            className={`px-2 py-1.5 text-[11px] font-bold transition disabled:opacity-50 ${
              periodo === p
                ? "bg-navy-deep text-white"
                : "bg-card text-muted hover:bg-surface-2"
            }`}
          >
            {p === "AM" ? "a. m." : "p. m."}
          </button>
        ))}
      </span>
    </div>
  )
}
