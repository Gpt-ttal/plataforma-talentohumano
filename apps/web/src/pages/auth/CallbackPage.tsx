import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { rutaInicialPorRol } from "@pys/shared"
import { useAuth } from "../../context/AuthContext"

/** Lee un error de OAuth devuelto por Supabase, sea en el hash (#) o el query (?). */
function leerErrorOAuth(): string | null {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
  const search = window.location.search.startsWith("?") ? window.location.search.slice(1) : ""
  for (const fuente of [hash, search]) {
    if (!fuente) continue
    const p = new URLSearchParams(fuente)
    const desc = p.get("error_description") ?? p.get("error")
    if (desc) return desc.replace(/\+/g, " ")
  }
  return null
}

/**
 * Aterrizaje del OAuth de Google. Supabase detecta la sesión del hash de la URL y
 * dispara `onAuthStateChange`; el AuthContext resuelve el usuario vía `/auth/me`.
 * Cuando hay usuario, se redirige por rol con `rutaInicialPorRol` (misma regla que
 * el árbol Next). Sin sesión → /login; sesión sin usuario activo → /pendiente.
 *
 * Si Google/Supabase devuelven un error (consentimiento denegado, usuario fuera
 * del dominio, no es test-user en GCP…), se lleva a /login con el motivo para
 * mostrarlo en vez de rebotar en silencio (bucle de reintento).
 */
export function CallbackPage() {
  const { usuario, session, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const errorOAuth = leerErrorOAuth()
    if (errorOAuth) {
      navigate("/login", { replace: true, state: { error: errorOAuth } })
      return
    }
    if (isLoading) return
    if (!session) {
      navigate("/login", { replace: true })
      return
    }
    if (usuario) {
      navigate(rutaInicialPorRol(usuario.rol, usuario.estado), { replace: true })
    } else {
      navigate("/pendiente", { replace: true })
    }
  }, [isLoading, session, usuario, navigate])

  return (
    <div className="grid min-h-[100dvh] place-items-center text-muted">
      <p className="text-sm">Verificando tu acceso…</p>
    </div>
  )
}
