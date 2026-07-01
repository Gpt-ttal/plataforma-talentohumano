import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * Buscador — búsqueda con debounce que escribe en la query (`?q=`). Mantiene el
 * texto local y, tras una pausa, actualiza la URL (de ahí en adelante es la URL la
 * fuente). Una búsqueda nueva vuelve a la página 1. El filtrado/paginado real lo
 * resuelve el backend al refetch.
 */
export function Buscador({
  placeholder = "Buscar por nombre o cédula…",
  paramName = "q",
}: {
  placeholder?: string
  paramName?: string
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [valor, setValor] = useState(searchParams.get(paramName) ?? "")

  useEffect(() => {
    const actual = searchParams.get(paramName) ?? ""
    // En el montaje (y cuando la URL ya coincide) no navegamos.
    if (valor === actual) return

    const t = setTimeout(() => {
      const sp = new URLSearchParams(searchParams)
      const v = valor.trim()
      if (v) sp.set(paramName, v)
      else sp.delete(paramName)
      sp.delete("pagina") // nueva búsqueda → página 1
      setSearchParams(sp, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [valor, paramName, searchParams, setSearchParams])

  return (
    <div className="relative w-full sm:max-w-sm">
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-border bg-card/88 py-2.5 pl-10 pr-4 text-sm text-foreground shadow-luxe placeholder:text-muted transition focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-300/45"
      />
    </div>
  )
}
