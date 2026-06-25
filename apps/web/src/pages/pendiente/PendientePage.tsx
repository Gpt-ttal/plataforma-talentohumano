import { Navigate } from "react-router-dom"
import { rutaInicialPorRol } from "@pys/shared"
import { useAuth } from "../../context/AuthContext"

/**
 * Cuenta autenticada pero sin acceso aún (PENDIENTE de asignación o INACTIVO).
 * Ofrece cerrar sesión. Si el backend ya la dejó ACTIVA, rebota a su lugar.
 * (Versión base de Fase 5; se pule en Fase 7.)
 */
export function PendientePage() {
  const { usuario, isLoading, logout } = useAuth()

  if (!isLoading && !usuario) return <Navigate to="/login" replace />
  if (!isLoading && usuario && usuario.estado === "ACTIVO") {
    return <Navigate to={rutaInicialPorRol(usuario.rol, usuario.estado)} replace />
  }

  const inactivo = usuario?.estado === "INACTIVO"

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-2xl ring-1 ring-gold/30">
        {inactivo ? "🔒" : "⏳"}
      </span>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900">
          {inactivo ? "Cuenta inactiva" : "Cuenta pendiente de activación"}
        </h1>
        <p className="text-sm text-silver-600">
          {inactivo
            ? "Tu acceso fue desactivado. Si crees que es un error, contacta al administrador."
            : "Tu correo quedó registrado. Un administrador debe asignarte un rol y un área antes de que puedas ingresar."}
        </p>
      </div>

      {usuario && (
        <p className="rounded-xl border border-silver-200 bg-silver-50 px-4 py-2 text-xs text-silver-600">
          Conectado como <strong className="text-navy-800">{usuario.email}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={() => void logout()}
        className="inline-flex items-center justify-center rounded-xl border border-silver-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-800 shadow-luxe transition hover:border-gold/50 hover:shadow-luxe-lg"
      >
        Cerrar sesión
      </button>
    </div>
  )
}
