import type { ReactNode } from "react"

interface AuthShellProps {
  /** Marca de la pieza, libre (logo del login o medallón de pendiente). */
  brand: ReactNode
  /** Wordmark — se renderiza con la serif reservada (`font-display`). */
  title: string
  subtitle: string
  /** Zona de acción: botón + pie. Lo aporta cada página. */
  children: ReactNode
}

/**
 * Chasis presentacional compartido por Login y Pendiente: tarjeta premium
 * centrada sobre papelería clara, con un acento oro que se dibuja y una entrada
 * coreografiada ("El Sello Lacrado"): la tarjeta sube → la marca destella → el
 * hairline oro se dibuja → el contenido escalona. Sin estado ni I/O.
 *
 * La marca (`brand`) va sin contenedor para que se integre nativa a la
 * superficie de la tarjeta; cada página decide su tratamiento (logo libre o
 * medallón). Respeta el Sello: oro ≤10%, serif solo en el wordmark, separación
 * por hairline, AA, `prefers-reduced-motion` (en index.css).
 */
export function AuthShell({ brand, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] justify-center overflow-y-auto px-4 py-10">
      <main className="animate-card-in my-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-luxe-lg">
        <div className="auth-stagger px-8 pb-9 pt-11 text-center">
          {/* Marca + hairline oro que se dibuja */}
          <div className="flex flex-col items-center">
            {brand}
            <span className="auth-rule rule-gold mt-7 block h-px w-16" aria-hidden />
          </div>

          <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>

          <div className="mt-7 space-y-4">{children}</div>
        </div>
      </main>
    </div>
  )
}
