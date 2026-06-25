/**
 * ListaSkeleton — placeholder de carga para las listas-acordeón. Calca la fila
 * colapsada de `FilaDesplegable` (hueco del chevron, avatar, dos líneas y la pill)
 * para que al resolver no haya salto de layout. Decorativo (`aria-hidden`); el
 * pulso respeta `prefers-reduced-motion`.
 */

// Anchos variados por fila para que el pulso lea como contenido, no como patrón.
const ANCHO_NOMBRE = ["w-40", "w-32", "w-44", "w-36", "w-28", "w-44"]
const ANCHO_META = ["w-56", "w-48", "w-52", "w-44", "w-56", "w-48"]

export function ListaSkeleton({ filas = 6 }: { filas?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="premium-card rounded-xl">
          <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
            <span className="h-7 w-7 shrink-0" />
            <span className="flex min-w-0 flex-1 items-center gap-3 px-1 py-1">
              <span className="premium-skeleton h-10 w-10 shrink-0 rounded-full motion-reduce:animate-none" />
              <span className="min-w-0 flex-1 space-y-2">
                <span
                  className={`premium-skeleton block h-3.5 max-w-[60%] motion-reduce:animate-none ${ANCHO_NOMBRE[i % ANCHO_NOMBRE.length]}`}
                />
                <span
                  className={`premium-skeleton block h-3 max-w-[75%] motion-reduce:animate-none ${ANCHO_META[i % ANCHO_META.length]}`}
                />
              </span>
              <span className="premium-skeleton hidden h-6 w-24 shrink-0 rounded-full motion-reduce:animate-none sm:block" />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
