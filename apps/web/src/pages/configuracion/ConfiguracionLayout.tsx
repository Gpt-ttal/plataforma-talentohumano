import { NavLink, Outlet, useLocation } from "react-router-dom"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { Icon } from "../../components/ui/dash/Icon"
import { useRole } from "../../hooks/useRole"
import { navParaRol } from "./configuracionNav"

/**
 * Shell de la suite de Configuración (adaptado del `SettingsLayout` de SIGAF):
 * `PageHeader` + aside con el nav filtrado por rol + `<Outlet/>` para la sub-página
 * activa. El nav se deriva de `configuracionNav.ts` (fuente única); el estado activo
 * lo resuelve `useLocation`. Las guardas reales viven en el backend.
 */
export function ConfiguracionLayout() {
  const { rol } = useRole()
  const { pathname } = useLocation()
  const items = rol ? navParaRol(rol) : []

  return (
    <div className="space-y-7">
      <PageHeader
        title="Configuración"
        description="Ajustes de tu cuenta y del sistema. Cada cambio se refleja en la plataforma y, cuando aplica, escribe directo a la base de datos vía el backend."
        meta={
          <>
            <span>Panel de administración</span>
            <span className="hidden text-faint sm:inline">/</span>
            <HeaderMetaDot tone="gold">Preferencias y gobierno</HeaderMetaDot>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
            {items.map((item) => {
              const active =
                pathname === item.to || pathname.startsWith(`${item.to}/`)
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={`group flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors lg:shrink ${
                    active
                      ? "bg-navy text-white shadow-luxe"
                      : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon
                    name={item.icono}
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-gold-200" : "text-faint group-hover:text-muted"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate leading-tight">{item.label}</span>
                    <span
                      className={`hidden truncate text-[11px] font-normal leading-tight lg:block ${
                        active ? "text-white/70" : "text-faint"
                      }`}
                    >
                      {item.desc}
                    </span>
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
