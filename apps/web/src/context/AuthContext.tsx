import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Session } from "@supabase/supabase-js"
import type { Usuario } from "@pys/shared"
import { supabase } from "../lib/supabase"
import { apiAuth, ApiError } from "../lib/api"

interface AuthState {
  /** Usuario resuelto por el backend (`/auth/me`): rol, estado y área reales. */
  usuario: Usuario | null
  session: Session | null
  /** true mientras se resuelve la sesión inicial y el `/auth/me`. */
  isLoading: boolean
  /**
   * true cuando hay sesión pero el backend fue inalcanzable al resolver
   * `/auth/me` (red caída, API abajo). Permite mostrar un aviso de reintento en
   * vez de quedar en pantalla en blanco. Un 401/403 NO activa esto (es una
   * respuesta válida del backend: sin usuario resoluble).
   */
  errorArranque: boolean
  loginGoogle: () => Promise<void>
  logout: () => Promise<void>
  /** Recarga el usuario desde el backend (p. ej. tras un cambio de rol propio). */
  refrescar: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Provee la identidad de la sesión. La fuente de verdad del rol/estado es el
 * backend (`/auth/me`), no el JWT: el frontend solo refleja lo que el servidor
 * dice. Login y logout van por Supabase Auth (Google OAuth).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorArranque, setErrorArranque] = useState(false)

  useEffect(() => {
    let activo = true

    async function cargarUsuario(s: Session | null): Promise<void> {
      if (!s) {
        if (activo) {
          setUsuario(null)
          setErrorArranque(false)
        }
        return
      }
      try {
        const u = await apiAuth.me()
        if (activo) {
          setUsuario(u)
          setErrorArranque(false)
        }
      } catch (e) {
        if (!activo) return
        setUsuario(null)
        // Un ApiError (401/403) es una respuesta válida del backend: sin usuario
        // resoluble → el guard lleva a /login o /pendiente. Cualquier otro error
        // (red caída, API inalcanzable) NO debe colgar la app: se marca para que
        // un guard pueda ofrecer reintentar.
        setErrorArranque(!(e instanceof ApiError))
      }
    }

    async function sincronizar(s: Session | null): Promise<void> {
      try {
        if (activo) setSession(s)
        await cargarUsuario(s)
      } finally {
        if (activo) setIsLoading(false)
      }
    }

    // Estado inicial. `onAuthStateChange` reacciona a los cambios. Se invocan sin
    // `await` dentro del callback de Supabase para no bloquear su lock interno.
    supabase.auth.getSession().then(({ data }) => {
      if (activo) void sincronizar(data.session ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (activo) void sincronizar(s)
    })

    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function loginGoogle(): Promise<void> {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    setUsuario(null)
    setSession(null)
  }

  async function refrescar(): Promise<void> {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setUsuario(null)
      setErrorArranque(false)
      return
    }
    try {
      setUsuario(await apiAuth.me())
      setErrorArranque(false)
    } catch (e) {
      setUsuario(null)
      setErrorArranque(!(e instanceof ApiError))
    }
  }

  return (
    <AuthContext.Provider
      value={{ usuario, session, isLoading, errorArranque, loginGoogle, logout, refrescar }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>")
  return ctx
}
