import { Navigate } from "react-router-dom"
import { rutaInicialPorRol } from "@pys/shared"
import { useAuth } from "../../context/AuthContext"
import { AuthShell } from "../../components/auth/AuthShell"
import { Icon } from "../../components/ui/dash/Icon"

/**
 * Cuenta autenticada pero sin acceso aún (PENDIENTE de asignación o INACTIVO).
 * Ofrece cerrar sesión. Si el backend ya la dejó ACTIVA, rebota a su lugar.
 * Comparte el chasis "El Sello Lacrado" con el login (se ven en secuencia).
 */
export function PendientePage() {
  const { usuario, isLoading, logout } = useAuth()

  if (!isLoading && !usuario) return <Navigate to="/login" replace />
  if (!isLoading && usuario && usuario.estado === "ACTIVO") {
    return <Navigate to={rutaInicialPorRol(usuario.rol, usuario.estado)} replace />
  }

  const inactivo = usuario?.estado === "INACTIVO"

  return (
    <AuthShell
      brand={
        <span className="auth-seal grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-surface-2 to-card shadow-sm ring-1 ring-gold-200/60">
          <Icon
            name={inactivo ? "lock" : "clock"}
            className={`h-7 w-7 ${inactivo ? "text-muted" : "text-gold-600"}`}
          />
        </span>
      }
      title={inactivo ? "Cuenta inactiva" : "Cuenta pendiente de activación"}
      subtitle={
        inactivo
          ? "Tu acceso fue desactivado. Si crees que es un error, contacta al administrador."
          : "Tu correo quedó registrado. Un administrador debe asignarte un rol y un área antes de que puedas ingresar."
      }
    >
      {usuario && (
        <p className="rounded-xl border border-border bg-surface-2 px-4 py-2 text-xs text-muted">
          Conectado como <strong className="text-foreground">{usuario.email}</strong>
        </p>
      )}

      <button
        type="button"
        onClick={() => void logout()}
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold/50 hover:shadow-luxe-lg"
      >
        Cerrar sesión
      </button>
    </AuthShell>
  )
}
