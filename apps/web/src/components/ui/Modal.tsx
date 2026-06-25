import { useCallback, useEffect, useRef, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"

/**
 * Modal premium centrado para el detalle. Cierra con Esc, clic en el backdrop o el
 * botón "×". Por defecto vuelve atrás (`navigate(-1)`) — al cerrar reaparece la
 * lista debajo; un `onClose` opcional permite controlarlo. Bloquea el scroll del
 * fondo y atrapa el foco de forma básica.
 */
export function Modal({
  children,
  onClose,
  ariaLabel = "Detalle",
}: {
  children: ReactNode
  onClose?: () => void
  ariaLabel?: string
}) {
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const cerrar = useCallback(() => {
    if (onClose) onClose()
    else navigate(-1)
  }, [onClose, navigate])

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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/45 px-4 py-8 backdrop-blur-sm animate-ps-fade sm:py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cerrar()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-silver-200 bg-silver-50 shadow-luxe-lg outline-none animate-ps-modal"
      >
        <span className="absolute inset-x-0 top-0 z-10 h-1 bg-gold-sheen" />

        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/80 text-silver-600 shadow-luxe ring-1 ring-silver-200 transition-colors hover:text-navy-700 hover:ring-gold-300"
        >
          <span aria-hidden className="text-lg leading-none">
            ×
          </span>
        </button>

        <div className="max-h-[82vh] overflow-y-auto p-6 pt-8 sm:p-7 sm:pt-9">
          {children}
        </div>
      </div>
    </div>
  )
}
