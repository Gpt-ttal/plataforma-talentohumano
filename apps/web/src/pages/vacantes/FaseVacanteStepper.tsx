import type { FaseVacante } from "@pys/shared"
import { FASES_VACANTE, FASE_VACANTE_LABEL, FASE_VACANTE_PASO_TONO, indiceFaseVacante } from "@pys/shared"

const BTN =
  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-all"
const BTN_ON =
  "bg-card/85 text-foreground ring-border hover:bg-card hover:text-foreground hover:ring-gold-300 hover:shadow-luxe"
const BTN_OFF = "cursor-not-allowed bg-surface-2/80 text-faint ring-border"

interface FaseVacanteStepperProps {
  faseActual: FaseVacante
  /** Deshabilitado en el último paso. */
  onAvanzar: () => void
  /** Deshabilitado en el primer paso. */
  onRetroceder: () => void
  /** Deshabilita ambos botones durante el PATCH en vuelo. */
  cargando?: boolean
}

/**
 * Track de las 7 fases del proceso de reclutamiento — navegación estrictamente
 * secuencial (Anterior/Siguiente). Los nodos NO son clickeables (evita saltar
 * fases); solo los botones mutan el estado. El oro queda reservado al paso
 * "actual" (Regla del Sello) — completado usa el verde `ok`, pendiente queda
 * en plata/neutro (3 tonos, no 7 colores).
 */
export function FaseVacanteStepper({
  faseActual,
  onAvanzar,
  onRetroceder,
  cargando = false,
}: FaseVacanteStepperProps) {
  const indiceActual = indiceFaseVacante(faseActual)
  const esPrimero = indiceActual <= 0
  const esUltimo = indiceActual >= FASES_VACANTE.length - 1

  return (
    <div className="flex flex-col gap-4">
      <ol role="list" className="hidden items-start gap-1 sm:flex">
        {FASES_VACANTE.map((fase, i) => {
          const posicion = i < indiceActual ? "completado" : i === indiceActual ? "actual" : "pendiente"
          const esActual = i === indiceActual
          return (
            <li key={fase} role="listitem" className="flex flex-1 items-center gap-1">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
                <span
                  key={esActual ? `${fase}-actual` : fase}
                  aria-current={esActual ? "step" : undefined}
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums ${FASE_VACANTE_PASO_TONO[posicion]} ${
                    esActual ? "animate-card-in" : ""
                  } ${esActual && cargando ? "animate-pulse motion-reduce:animate-none" : ""}`}
                >
                  {i + 1}
                </span>
                <span
                  className={`line-clamp-2 text-[11px] leading-tight ${
                    esActual ? "font-semibold text-foreground" : "text-muted"
                  }`}
                >
                  {FASE_VACANTE_LABEL[fase]}
                </span>
              </div>
              {i < FASES_VACANTE.length - 1 && (
                <span aria-hidden className="mt-3.5 h-px flex-1 bg-border" />
              )}
            </li>
          )
        })}
      </ol>

      <p className="text-sm text-muted sm:hidden">
        Paso <span className="font-semibold tabular-nums text-foreground">{indiceActual + 1}</span> de{" "}
        {FASES_VACANTE.length}: <span className="font-semibold text-foreground">{FASE_VACANTE_LABEL[faseActual]}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRetroceder}
          disabled={cargando || esPrimero}
          aria-disabled={cargando || esPrimero}
          className={`${BTN} ${cargando || esPrimero ? BTN_OFF : BTN_ON}`}
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={onAvanzar}
          disabled={cargando || esUltimo}
          aria-disabled={cargando || esUltimo}
          className={`${BTN} ${cargando || esUltimo ? BTN_OFF : BTN_ON}`}
        >
          Siguiente →
        </button>
      </div>
    </div>
  )
}
