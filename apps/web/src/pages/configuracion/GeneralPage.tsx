import { Link } from "react-router-dom"
import { ROL_LABEL } from "@pys/shared"
import { Panel } from "../../components/ui/dash/primitives"
import { Icon } from "../../components/ui/dash/Icon"
import { useRole } from "../../hooks/useRole"
import { useAuth } from "../../context/AuthContext"
import { SummaryTile } from "./ui"
import { navParaRol } from "./configuracionNav"

/**
 * General — portada de la suite: identidad del producto + accesos rápidos a las
 * demás sub-páginas visibles para el rol (derivados del nav, sin hardcodear). Es la
 * "réplica adaptada" del `GeneralSettings` de SIGAF: mismo propósito, tokens propios.
 */
export function GeneralPage() {
  const { rol } = useRole()
  const { usuarioReal } = useAuth()
  // Accesos rápidos: el resto de sub-páginas del rol (General se excluye a sí misma).
  const accesos = (rol ? navParaRol(rol) : []).filter((i) => i.id !== "general")

  return (
    <div className="space-y-6">
      <Panel icon="grid" title="Sistema Paz y Salvo">
        <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
          Plataforma de Talento Humano de la Corporación Universitaria Americana.
          Digitaliza el trámite de paz y salvo y agrupa los módulos de personal,
          capacitaciones, cursos, vacantes y desvinculaciones en un circuito único,
          auditable y acotado por rol.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryTile
            icono="badge"
            label="Producto"
            value="Paz y Salvo v2"
            sub="Plataforma de Talento Humano"
          />
          <SummaryTile
            icono="users"
            label="Tu rol"
            value={rol ? ROL_LABEL[rol] : "—"}
            sub={usuarioReal?.email ?? "Sesión activa"}
          />
          <SummaryTile
            icono="shield-check"
            label="Autorización"
            value="Centralizada en backend"
            sub="El servidor garantiza cada acción"
          />
        </div>
      </Panel>

      {accesos.length > 0 && (
        <Panel icon="arrow" title="Accesos rápidos">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {accesos.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition-colors hover:border-gold-300 hover:bg-card"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-muted transition-colors group-hover:text-foreground">
                  <Icon name={item.icono} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-muted">{item.desc}</span>
                </span>
                <Icon
                  name="arrow"
                  className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-gold-600"
                />
              </Link>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
