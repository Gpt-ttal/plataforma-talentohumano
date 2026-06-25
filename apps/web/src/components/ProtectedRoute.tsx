import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import type { RolUsuario } from "@pys/shared"
import { useAuth } from "../context/AuthContext"

/**
 * Guarda de UX (NO de autorización). Refleja el estado que el backend ya resolvió:
 *  - cargando → nada (espera a resolver `/auth/me`);
 *  - sin sesión → /login;
 *  - sesión sin rol activo (PENDIENTE/INACTIVO) → /pendiente;
 *  - rol fuera del conjunto permitido → /no-access.
 * La autorización real vive en el servidor; si alguien evade esto, el API responde 403.
 */
export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: RolUsuario[]
  children: ReactNode
}) {
  const { usuario, isLoading, errorArranque, refrescar } = useAuth()
  const location = useLocation()

  if (isLoading) return null

  // Sesión válida pero backend inalcanzable: ofrecer reintento en vez de mandar a
  // /login (la sesión no expiró) ni quedar en blanco.
  if (errorArranque) {
    return (
      <div className="mx-auto grid min-h-[100dvh] max-w-md place-items-center px-4 text-center">
        <div className="space-y-4">
          <h1 className="font-display text-xl font-semibold text-navy-900">
            No pudimos conectar con el servidor
          </h1>
          <p className="text-sm text-silver-600">
            Revisa tu conexión e inténtalo de nuevo. Tu sesión sigue activa.
          </p>
          <button
            type="button"
            onClick={() => void refrescar()}
            className="inline-flex items-center justify-center rounded-xl border border-silver-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 shadow-luxe transition hover:border-gold/50 hover:shadow-luxe-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (usuario.estado !== "ACTIVO") {
    return <Navigate to="/pendiente" replace />
  }

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/no-access" replace />
  }

  return <>{children}</>
}
