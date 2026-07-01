import { useId, useState, type ReactNode } from "react"

/**
 * FilaDesplegable — fila tipo acordeón.
 *  · `cabecera`  → siempre visible; ES el disparador (sin enlaces/botones dentro
 *                  para no anidar interactivos).
 *  · `acciones`  → a la derecha, fuera del disparador (sí admite botones/enlaces).
 *  · `children`  → contenido revelado al expandir.
 */
export function FilaDesplegable({
  cabecera,
  acciones,
  children,
  defaultOpen = false,
}: {
  cabecera: ReactNode
  acciones?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [abierto, setAbierto] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className="premium-card row-fade overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={() => setAbierto((o) => !o)}
          aria-expanded={abierto}
          aria-controls={panelId}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-estado-listoBg"
        >
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all duration-200 ${
              abierto
                ? "border-gold-300 bg-gold-50 text-gold-700"
                : "border-border bg-card/70 text-faint group-hover:border-gold-200 group-hover:text-gold-600"
            }`}
            aria-hidden
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className={`transition-transform duration-200 ${abierto ? "rotate-90" : ""}`}
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">{cabecera}</span>
        </button>
        {acciones && <div className="shrink-0 pl-1">{acciones}</div>}
      </div>

      {abierto && (
        <div
          id={panelId}
          role="region"
          className="border-t border-hairline bg-gradient-to-b from-surface-2/75 to-card/70 px-4 py-4 sm:px-5"
        >
          <div className="premium-hairline mb-4 h-px" />
          {children}
        </div>
      )}
    </div>
  )
}
