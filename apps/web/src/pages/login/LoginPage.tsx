import { Navigate, useLocation } from "react-router-dom"
import { rutaInicialPorRol } from "@pys/shared"
import { useAuth } from "../../context/AuthContext"

/**
 * Entrada al sistema. Login institucional con Google (Supabase Auth). Si ya hay
 * sesión activa, se redirige por rol. Si el callback de OAuth devolvió un error
 * (dominio rechazado, no es test-user en GCP…), se muestra un aviso sobrio.
 */
export function LoginPage() {
  const { usuario, isLoading, loginGoogle } = useAuth()
  const location = useLocation()
  const errorOAuth = (location.state as { error?: string } | null)?.error ?? null

  if (!isLoading && usuario && usuario.estado === "ACTIVO") {
    return <Navigate to={rutaInicialPorRol(usuario.rol, usuario.estado)} replace />
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center justify-center gap-8 px-4 text-center">
      <img
        src="/logo-americana-completo.png"
        alt="Corporación Universitaria Americana — Vigilada Mineducación"
        className="h-auto w-72 max-w-[82%] drop-shadow-[0_4px_14px_rgba(182,141,64,0.28)]"
      />

      {errorOAuth && (
        <p
          role="alert"
          className="w-full rounded-xl border border-estado-rechazo/30 bg-estado-rechazo/5 px-4 py-3 text-sm text-estado-rechazo"
        >
          No se pudo iniciar sesión: {errorOAuth}
        </p>
      )}

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-navy-900">
          Sistema de Paz y Salvo
        </h1>
        <p className="text-sm text-silver-600">
          Acceso institucional para la gestión del retiro de funcionarios.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void loginGoogle()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-silver-300 bg-white px-5 py-3 text-sm font-semibold text-navy-800 shadow-luxe transition hover:border-gold/50 hover:shadow-luxe-lg"
      >
        Continuar con Google
      </button>
    </div>
  )
}
