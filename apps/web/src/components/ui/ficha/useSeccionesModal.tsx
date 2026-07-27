import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react"

/**
 * Registro de secciones de una ficha dentro de un modal. `Seccion` se auto-registra
 * por `id` (sin prop-drilling de refs ni `querySelector` frágil) y la navegación
 * pegajosa hace `irA(id)` → `scrollIntoView` dentro del contenedor de scroll del
 * modal. Respeta `prefers-reduced-motion` (salto instantáneo si el usuario lo pide).
 */
type RegistroSecciones = {
  registrar: (id: string, el: HTMLElement | null) => void
  irA: (id: string) => void
}

const SeccionesContext = createContext<RegistroSecciones | null>(null)

export function ProveedorSecciones({ children }: { children: ReactNode }) {
  const refs = useRef(new Map<string, HTMLElement>())

  const registrar = useCallback((id: string, el: HTMLElement | null) => {
    if (el) refs.current.set(id, el)
    else refs.current.delete(id)
  }, [])

  const irA = useCallback((id: string) => {
    const el = refs.current.get(id)
    if (!el) return
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" })
  }, [])

  const valor = useMemo<RegistroSecciones>(() => ({ registrar, irA }), [registrar, irA])
  return <SeccionesContext.Provider value={valor}>{children}</SeccionesContext.Provider>
}

/** Contexto crudo (nav pegajosa lo usa para `irA`). Lanza fuera del proveedor. */
export function useSecciones(): RegistroSecciones {
  const ctx = useContext(SeccionesContext)
  if (!ctx) throw new Error("useSecciones debe usarse dentro de <ProveedorSecciones>")
  return ctx
}

/**
 * Callback-ref que registra/da de baja una sección por `id`. Estable mientras el
 * `id` no cambie, así no re-registra en cada render.
 */
export function useRegistroSeccion(id: string): (el: HTMLElement | null) => void {
  const { registrar } = useSecciones()
  return useCallback((el: HTMLElement | null) => registrar(id, el), [registrar, id])
}
