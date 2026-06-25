import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

/**
 * Cierre de sesión: termina la sesión de Supabase y vuelve a /login. Reusa el
 * `logout` del AuthContext (limpia usuario y sesión locales).
 */
export function BotonSalir({
  className,
  children = "Cerrar sesión",
}: {
  className?: string
  children?: ReactNode
}) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(false)

  async function salir() {
    setCargando(true)
    try {
      await logout()
    } finally {
      navigate("/login", { replace: true })
    }
  }

  return (
    <button
      type="button"
      onClick={() => void salir()}
      disabled={cargando}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-silver-600 transition hover:text-navy-800 disabled:opacity-60"
      }
    >
      {cargando ? "Saliendo…" : children}
    </button>
  )
}
