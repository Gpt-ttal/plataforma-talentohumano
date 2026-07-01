import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Session } from "@supabase/supabase-js"
import type { RolUsuario, Usuario } from "@pys/shared"
import { supabase } from "../lib/supabase"
import { apiAuth, ApiError } from "../lib/api"
import { queryClient } from "../lib/queryClient"
import { suscribirRealtime } from "../lib/realtime"

/**
 * Impersonación de rol (herramienta de desarrollo, solo SUPERADMIN). El JWT real
 * sigue siendo el del superadmin —el backend autoriza todo—; aquí solo se reescribe
 * el `usuario` efectivo (rol + área) que ve la UI, para experimentar la experiencia
 * de cada rol sin tocar la cuenta real. La identidad real queda siempre guardada.
 */
interface Impersonacion {
  rol: RolUsuario
  areaId: string | null
}

const CLAVE_IMPERSONACION = "pys_impersonacion"

function leerImpersonacion(): Impersonacion | null {
  try {
    const raw = sessionStorage.getItem(CLAVE_IMPERSONACION)
    return raw ? (JSON.parse(raw) as Impersonacion) : null
  } catch {
    return null
  }
}

interface AuthState {
  /**
   * Usuario efectivo que ve la UI: el real, o el impersonado si el superadmin
   * activó la herramienta de roles. Rol/estado/área que reflejan la experiencia.
   */
  usuario: Usuario | null
  /** Usuario real resuelto por el backend (`/auth/me`), sin impersonación. */
  usuarioReal: Usuario | null
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
  /** Impersonación activa (solo si el usuario real es SUPERADMIN), o null. */
  impersonacion: Impersonacion | null
  loginGoogle: () => Promise<void>
  logout: () => Promise<void>
  /** Recarga el usuario desde el backend (p. ej. tras un cambio de rol propio). */
  refrescar: () => Promise<void>
  /** Activa la impersonación de un rol/área (solo SUPERADMIN). */
  impersonar: (rol: RolUsuario, areaId?: string | null) => void
  /** Restaura la identidad real (vuelve a Admin). */
  detenerImpersonacion: () => void
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Provee la identidad de la sesión. La fuente de verdad del rol/estado es el
 * backend (`/auth/me`), no el JWT: el frontend solo refleja lo que el servidor
 * dice. Login y logout van por Supabase Auth (Google OAuth).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [usuarioReal, setUsuarioReal] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorArranque, setErrorArranque] = useState(false)
  const [impersonacionRaw, setImpersonacionRaw] = useState<Impersonacion | null>(
    leerImpersonacion,
  )

  // La impersonación solo es válida si el usuario REAL es superadmin. Esto evita
  // que una entrada de sessionStorage huérfana altere a un usuario no autorizado.
  const impersonacion =
    usuarioReal?.rol === "SUPERADMIN" ? impersonacionRaw : null

  // Usuario efectivo: el real, o uno derivado con el rol/área impersonados.
  const usuario = useMemo<Usuario | null>(() => {
    if (!usuarioReal) return null
    if (!impersonacion) return usuarioReal
    return {
      ...usuarioReal,
      rol: impersonacion.rol,
      areaId: impersonacion.rol === "AREA" ? impersonacion.areaId : null,
    }
  }, [usuarioReal, impersonacion])

  useEffect(() => {
    let activo = true

    async function cargarUsuario(s: Session | null): Promise<void> {
      if (!s) {
        if (activo) {
          setUsuarioReal(null)
          setErrorArranque(false)
        }
        return
      }
      try {
        const u = await apiAuth.me()
        if (activo) {
          setUsuarioReal(u)
          setErrorArranque(false)
        }
      } catch (e) {
        if (!activo) return
        setUsuarioReal(null)
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

  // Sincronía en vivo: un único canal Realtime mientras haya un usuario activo.
  // Se (re)suscribe al cambiar de identidad y se limpia al salir o desmontar.
  // Se liga al usuario REAL (la impersonación no cambia la identidad de la sesión).
  useEffect(() => {
    if (!usuarioReal || usuarioReal.estado !== "ACTIVO") return
    const desuscribir = suscribirRealtime(queryClient)
    return desuscribir
  }, [usuarioReal?.id, usuarioReal?.estado])

  async function loginGoogle(): Promise<void> {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    sessionStorage.removeItem(CLAVE_IMPERSONACION)
    setImpersonacionRaw(null)
    setUsuarioReal(null)
    setSession(null)
  }

  async function refrescar(): Promise<void> {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setUsuarioReal(null)
      setErrorArranque(false)
      return
    }
    try {
      setUsuarioReal(await apiAuth.me())
      setErrorArranque(false)
    } catch (e) {
      setUsuarioReal(null)
      setErrorArranque(!(e instanceof ApiError))
    }
  }

  function impersonar(rol: RolUsuario, areaId: string | null = null): void {
    if (usuarioReal?.rol !== "SUPERADMIN") return
    const next: Impersonacion = { rol, areaId: rol === "AREA" ? areaId : null }
    sessionStorage.setItem(CLAVE_IMPERSONACION, JSON.stringify(next))
    setImpersonacionRaw(next)
    // Limpia caché de queries para que cada vista refetchee con el nuevo rol.
    void queryClient.invalidateQueries()
  }

  function detenerImpersonacion(): void {
    sessionStorage.removeItem(CLAVE_IMPERSONACION)
    setImpersonacionRaw(null)
    void queryClient.invalidateQueries()
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        usuarioReal,
        session,
        isLoading,
        errorArranque,
        impersonacion,
        loginGoogle,
        logout,
        refrescar,
        impersonar,
        detenerImpersonacion,
      }}
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
