import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"

/**
 * Registro de ediciones "sucias" abiertas dentro del modal. Cada editor que abre
 * una captura se registra vía `useGuardaCierre`; al cerrar (Esc, ×, backdrop) el
 * Modal pide confirmación si queda alguna abierta — evita la pérdida silenciosa de
 * datos (P1). Es un `Set` en un ref (no estado): no debe re-renderizar el árbol.
 */
type GuardaCierre = {
  registrar: (id: string) => void
  desregistrar: (id: string) => void
}
const GuardaCierreContext = createContext<GuardaCierre | null>(null)

/**
 * Registra una edición abierta mientras `activo` es true. El `id` identifica al
 * editor (uno por instancia; basta un slug semántico estable). Sin `<Modal>`
 * padre es un no-op, así el hook es seguro de usar en editores fuera de modal.
 */
export function useGuardaCierre(activo: boolean, id: string) {
  const ctx = useContext(GuardaCierreContext)
  useEffect(() => {
    if (!ctx || !activo) return
    ctx.registrar(id)
    return () => ctx.desregistrar(id)
  }, [ctx, activo, id])
}

/**
 * Modal premium centrado para el detalle. Cierra con Esc, clic en el backdrop
 * (desactivable con `cerrarAlClickFuera`) o el botón "×". Por defecto vuelve atrás
 * (`navigate(-1)`) — al cerrar reaparece la lista debajo; un `onClose` opcional
 * permite controlarlo. Bloquea el scroll del fondo y atrapa el foco de forma básica.
 * Si hay ediciones abiertas registradas (`useGuardaCierre`), confirma antes de cerrar.
 */
export function Modal({
  children,
  onClose,
  ariaLabel = "Detalle",
  ariaLabelledby,
  size = "3xl",
  cerrarAlClickFuera = true,
}: {
  children: ReactNode
  onClose?: () => void
  /** Etiqueta accesible textual. Se ignora si se pasa `ariaLabelledby`. */
  ariaLabel?: string
  /** `id` del heading que nombra el diálogo (preferido sobre `ariaLabel`). */
  ariaLabelledby?: string
  /** Ancho máximo del panel. Default `3xl` (768px); `4xl` (896px) para fichas densas. */
  size?: "3xl" | "4xl"
  /** Si `false`, el clic en el backdrop no cierra (Esc sí). Para fichas editables. */
  cerrarAlClickFuera?: boolean
}) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)
  // Clases literales (no construir nombres en runtime — regla Tailwind del proyecto).
  const anchoClase = size === "4xl" ? "max-w-4xl" : "max-w-3xl"

  const sucios = useRef(new Set<string>())
  const guarda = useMemo<GuardaCierre>(
    () => ({
      registrar: (id) => sucios.current.add(id),
      desregistrar: (id) => sucios.current.delete(id),
    }),
    [],
  )

  const cerrar = useCallback(() => {
    if (
      sucios.current.size > 0 &&
      !window.confirm("Hay cambios sin guardar en una edición abierta. ¿Cerrar de todos modos?")
    ) {
      return
    }
    if (onClose) onClose()
    else navigate(-1)
  }, [onClose, navigate])

  useEffect(() => {
    // Extiende la guarda de pérdida de datos a recarga/cierre de pestaña: el cierre
    // interno (Esc/×/backdrop) ya confirma vía `cerrar()`, pero un F5 o cerrar la
    // pestaña desmontaría el editor sin aviso. El navegador solo muestra su diálogo
    // nativo si hay ediciones registradas (`useGuardaCierre`).
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (sucios.current.size > 0) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  useEffect(() => {
    // Guardar el foco previo para restaurarlo al cerrar (WCAG 2.4.3).
    const focoPrevio = document.activeElement as HTMLElement | null

    function focusables(): HTMLElement[] {
      const sel =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      return Array.from(panelRef.current?.querySelectorAll<HTMLElement>(sel) ?? [])
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        cerrar()
        return
      }
      // Focus-trap: el Tab cicla dentro del panel, no se escapa a la lista detrás.
      if (e.key === "Tab") {
        const elementos = focusables()
        const primero = elementos[0]
        const ultimo = elementos[elementos.length - 1]
        if (!primero || !ultimo) return
        const activo = document.activeElement
        if (e.shiftKey && (activo === primero || activo === panelRef.current)) {
          e.preventDefault()
          ultimo.focus()
        } else if (!e.shiftKey && activo === ultimo) {
          e.preventDefault()
          primero.focus()
        }
      }
    }

    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    panelRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      focoPrevio?.focus?.()
    }
  }, [cerrar])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay/45 px-4 py-8 animate-ps-fade sm:py-12"
      onMouseDown={(e) => {
        if (cerrarAlClickFuera && e.target === e.currentTarget) cerrar()
      }}
      role="dialog"
      aria-modal="true"
      // `aria-labelledby` gana cuando su id existe (contenido cargado); `aria-label`
      // queda de respaldo textual mientras el heading aún no está montado (skeleton).
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${anchoClase} overflow-hidden rounded-2xl border border-border bg-surface shadow-luxe-lg outline-none animate-ps-modal`}
      >
        <span className="absolute inset-x-0 top-0 z-10 h-1 bg-gold-sheen" />

        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-card/80 text-muted shadow-luxe ring-1 ring-border transition-colors hover:text-foreground hover:ring-gold-300"
        >
          <span aria-hidden className="text-xl leading-none">
            ×
          </span>
        </button>

        <div className="max-h-[82vh] overflow-y-auto p-6 pt-8 sm:p-7 sm:pt-9">
          <GuardaCierreContext.Provider value={guarda}>{children}</GuardaCierreContext.Provider>
        </div>
      </div>
    </div>
  )
}
