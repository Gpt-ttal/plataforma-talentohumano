import { useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { rutaInicialPorRol } from "@pys/shared"
import { useAuth } from "../../context/AuthContext"
import { AuthShell } from "../../components/auth/AuthShell"
import { GoogleIcon } from "../../components/auth/GoogleIcon"

/**
 * Entrada al sistema. Login institucional con Google (Supabase Auth). Si ya hay
 * sesión activa, se redirige por rol. Si el callback de OAuth devolvió un error
 * (dominio rechazado, no es test-user en GCP…), se muestra un aviso sobrio.
 */
export function LoginPage() {
  const { usuario, isLoading, loginGoogle } = useAuth()
  const location = useLocation()
  const errorOAuth = (location.state as { error?: string } | null)?.error ?? null
  const [cargando, setCargando] = useState(false)

  if (!isLoading && usuario && usuario.estado === "ACTIVO") {
    return <Navigate to={rutaInicialPorRol(usuario.rol, usuario.estado)} replace />
  }

  return (
    <AuthShell
      brand={
        <img
          src="/logo-americana-completo.png"
          alt="Corporación Universitaria Americana — Vigilada Mineducación"
          width={748}
          height={333}
          className="h-auto w-64 max-w-[82%] object-contain drop-shadow-[0_6px_16px_rgba(182,141,64,0.20)]"
        />
      }
      title="Gestión Humana"
      subtitle="Acceso a la plataforma integral de talento humano."
    >
      {errorOAuth && (
        <p
          role="alert"
          className="rounded-xl border border-estado-rechazo/30 bg-estado-rechazo/5 px-4 py-3 text-sm text-estado-rechazo"
        >
          No se pudo iniciar sesión: {errorOAuth}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setCargando(true)
          void loginGoogle()
        }}
        disabled={cargando || isLoading}
        aria-busy={cargando}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold/50 hover:shadow-luxe-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cargando ? (
          <>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 animate-spin text-muted motion-reduce:hidden"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Conectando…
          </>
        ) : (
          <>
            <GoogleIcon className="h-5 w-5" />
            Continuar con Google
          </>
        )}
      </button>

      <p className="text-xs text-muted">
        Acceso exclusivo · dominio <strong className="text-foreground">@americana.edu.co</strong>
      </p>
    </AuthShell>
  )
}
