import { useEffect, useState } from "react"

/**
 * `true` si el usuario pidió reducir el movimiento. Las gráficas lo usan para
 * desactivar sus animaciones (Sello / a11y: `prefers-reduced-motion`).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduce(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  return reduce
}
