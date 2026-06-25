import { useEffect, useMemo, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import type { RolUsuario } from "@pys/shared"
import { ROL_LABEL } from "@pys/shared"
import { useAuth } from "../context/AuthContext"
import { BotonSalir } from "./BotonSalir"

/**
 * Layout — chasis de la app (sidebar navy por rol + barra superior). Portado de
 * `AppShell` del árbol Next: `next/link`→`Link`, `usePathname`→`useLocation`,
 * `next/image`→`<img>`, sesión por `useAuth` y cierre real con `BotonSalir`.
 * Solo envuelve rutas protegidas; sin usuario delega en el `Outlet` (la guarda hija
 * redirige).
 */

type IconName =
  | "archive"
  | "area"
  | "chevronLeft"
  | "chevronRight"
  | "close"
  | "dashboard"
  | "file"
  | "menu"
  | "users"

interface NavItem {
  href: string
  label: string
  icon: IconName
  active: (pathname: string) => boolean
  status?: "live" | "core"
}

interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

const routeLabels: { path: string; title: string; section: string }[] = [
  { path: "/usuarios", title: "Usuarios", section: "Administracion" },
  { path: "/paz-y-salvo/mi-area", title: "Mi area", section: "Operacion" },
  { path: "/paz-y-salvo/talento-humano", title: "Talento Humano", section: "Paz y Salvo" },
  { path: "/paz-y-salvo/control-interno", title: "Control Interno", section: "Paz y Salvo" },
  { path: "/paz-y-salvo/funcionarios", title: "Funcionarios", section: "Gestion" },
  { path: "/archivo", title: "Archivo institucional", section: "Administracion" },
  { path: "/inicio", title: "Panel de control", section: "Plataforma" },
]

function iconPath(name: IconName): string {
  return {
    archive: "M3 7h18M5 7v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7M3 7l1.5-3h15L21 7M9 12h6",
    area: "M3 21h18M5 21V5a2 2 0 0 1 2-2h7v18M14 8h5a2 2 0 0 1 2 2v11M8 7h2M8 11h2M8 15h2M17 12h1M17 16h1",
    chevronLeft: "M15 18l-6-6 6-6",
    chevronRight: "M9 18l6-6-6-6",
    close: "M18 6 6 18M6 6l12 12",
    dashboard: "M4 13h6V4H4v9ZM14 20h6V4h-6v16ZM4 20h6v-3H4v3Z",
    file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M8 13h8M8 17h5",
    menu: "M4 6h16M4 12h16M4 18h16",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  }[name]
}

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={iconPath(name)} />
    </svg>
  )
}

function sectionsForRole(rol: RolUsuario): NavSection[] {
  // rolVePlataforma(rol) == true → SA | TH: ven /inicio + módulo + (solo SA) Usuarios.
  // rolVePlataforma(rol) == false → CI | AREA (acotados): solo su trabajo en el módulo.

  if (rol === "SUPERADMIN") {
    return [
      {
        id: "plataforma",
        title: "Plataforma",
        items: [
          {
            href: "/inicio",
            label: "Panel de control",
            icon: "dashboard",
            active: (p) => p === "/inicio",
            status: "core",
          },
        ],
      },
      {
        id: "paz-y-salvo",
        title: "Paz y Salvo",
        items: [
          {
            href: "/paz-y-salvo/funcionarios",
            label: "Funcionarios",
            icon: "file",
            active: (p) => p.startsWith("/paz-y-salvo/funcionarios"),
            status: "live",
          },
          {
            href: "/paz-y-salvo/mi-area",
            label: "Areas",
            icon: "area",
            active: (p) => p.startsWith("/paz-y-salvo/mi-area"),
            status: "live",
          },
        ],
      },
      {
        id: "administracion",
        title: "Administracion",
        items: [
          {
            href: "/archivo",
            label: "Archivo",
            icon: "archive",
            active: (p) => p.startsWith("/archivo"),
            status: "live",
          },
          {
            href: "/usuarios",
            label: "Usuarios",
            icon: "users",
            active: (p) => p.startsWith("/usuarios"),
            status: "live",
          },
        ],
      },
    ]
  }

  if (rol === "TALENTO_HUMANO") {
    return [
      {
        id: "plataforma",
        title: "Plataforma",
        items: [
          {
            href: "/inicio",
            label: "Panel de control",
            icon: "dashboard",
            active: (p) => p === "/inicio",
            status: "core",
          },
        ],
      },
      {
        id: "paz-y-salvo",
        title: "Paz y Salvo",
        items: [
          {
            href: "/paz-y-salvo/talento-humano",
            label: "Talento Humano",
            icon: "file",
            active: (p) => p.startsWith("/paz-y-salvo/talento-humano"),
            status: "live",
          },
        ],
      },
      {
        id: "administracion",
        title: "Administracion",
        items: [
          {
            href: "/archivo",
            label: "Archivo",
            icon: "archive",
            active: (p) => p.startsWith("/archivo"),
            status: "live",
          },
        ],
      },
    ]
  }

  if (rol === "CONTROL_INTERNO") {
    return [
      {
        id: "paz-y-salvo",
        title: "Paz y Salvo",
        items: [
          {
            href: "/paz-y-salvo/control-interno",
            label: "Control Interno",
            icon: "file",
            active: (p) => p.startsWith("/paz-y-salvo/control-interno"),
            status: "live",
          },
        ],
      },
    ]
  }

  // AREA (acotado): solo su cola de trabajo
  return [
    {
      id: "operacion",
      title: "Operacion",
      items: [
        {
          href: "/paz-y-salvo/mi-area",
          label: "Mi area",
          icon: "area",
          active: (p) => p.startsWith("/paz-y-salvo/mi-area"),
          status: "live",
        },
      ],
    },
  ]
}

function routeInfo(pathname: string) {
  return (
    routeLabels.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`)) ??
    routeLabels[routeLabels.length - 1]!
  )
}

function SidebarContent({
  collapsed,
  mobile,
  sections,
  pathname,
  onNavigate,
}: {
  collapsed: boolean
  mobile?: boolean
  sections: NavSection[]
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="relative z-10 flex flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-3">
      {sections.map((section, sectionIndex) => (
        <div key={section.id}>
          {!collapsed ? (
            <div className="mb-1.5 flex items-center gap-2 px-1.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#d8c38d]">
                {section.title}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-gold-200/18 to-transparent" />
            </div>
          ) : (
            sectionIndex > 0 && <div className="mx-2 mb-2 h-px bg-white/8" />
          )}

          <div className="flex flex-col gap-1">
            {section.items.map((item) => {
              const active = item.active(pathname)
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={`group relative flex items-center rounded-lg py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                    collapsed && !mobile ? "justify-center px-2" : "gap-2.5 px-2.5"
                  } ${
                    active
                      ? "bg-gradient-to-r from-gold-400/18 via-gold-400/8 to-transparent text-white shadow-[inset_3px_0_0_rgba(218,181,94,0.95)]"
                      : "text-[#d7dfef] hover:bg-white/[0.09] hover:text-white"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    className={`h-[15px] w-[15px] shrink-0 transition ${
                      active
                        ? "text-white drop-shadow-[0_0_7px_rgba(218,181,94,0.7)]"
                        : "text-[#aeb9cc] group-hover:text-white"
                    }`}
                  />
                  {(!collapsed || mobile) && (
                    <>
                      <span className="min-w-0 flex-1 truncate leading-none">{item.label}</span>
                      {item.status === "live" && (
                        <span
                          className={
                            active
                              ? "live-dot"
                              : "h-1.5 w-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_5px_rgba(52,211,153,0.55)]"
                          }
                        />
                      )}
                      {item.status === "core" && (
                        <span className="rounded border border-gold-300/35 bg-gold-400/14 px-1.5 py-px font-mono text-[8px] uppercase tracking-[0.16em] text-gold-100">
                          core
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function Layout() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem("pys_sidebar") === "collapsed")
  }, [])

  const sections = useMemo(
    () => (usuario ? sectionsForRole(usuario.rol) : []),
    [usuario],
  )
  const info = routeInfo(pathname)

  // Sin usuario (cargando o no autenticado): la guarda hija decide; sin chrome.
  if (!usuario) return <Outlet />

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem("pys_sidebar", next ? "collapsed" : "expanded")
      return next
    })
  }

  return (
    <div className="flex min-h-[100dvh] overflow-hidden bg-transparent">
      <aside
        className={`relative hidden min-h-[100dvh] shrink-0 select-none overflow-hidden border-r border-gold-300/10 bg-[#0b1324] shadow-[18px_0_60px_-42px_rgba(0,0,0,0.75)] transition-[width] duration-300 lg:flex lg:flex-col ${
          collapsed ? "w-[68px]" : "w-[252px]"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,rgba(218,181,94,0.13),transparent_65%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/55 to-transparent" />

        <div
          className={`relative z-10 flex h-16 shrink-0 items-center border-b border-white/[0.07] ${
            collapsed ? "justify-center px-0" : "justify-between gap-3 px-4"
          }`}
        >
          <Link to="/" className={`flex min-w-0 items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <img
              src="/logo-americana.png"
              alt="Escudo Corporacion Universitaria Americana"
              width={40}
              height={53}
              className="h-8 w-auto shrink-0 drop-shadow-[0_0_14px_rgba(218,181,94,0.42)]"
            />
            {!collapsed && (
              <span className="min-w-0 leading-none">
                <span className="block truncate text-[15px] font-bold tracking-wide text-white">
                  Paz y Salvo
                </span>
                <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.22em] text-[#d8c38d]">
                  Americana
                </span>
              </span>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Colapsar menu"
              className="grid h-7 w-7 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Icon name="chevronLeft" className="h-3.5 w-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Expandir menu"
              className="absolute -right-3 top-5 grid h-6 w-6 place-items-center rounded-full border border-gold-300/20 bg-[#101a30] text-gold-200 shadow-lg transition hover:border-gold-300/45"
            >
              <Icon name="chevronRight" className="h-3 w-3" />
            </button>
          )}
        </div>

        <SidebarContent collapsed={collapsed} sections={sections} pathname={pathname} />

        <div className="relative z-10 border-t border-white/[0.07] p-3">
          {!collapsed ? (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-400/12 text-xs font-bold text-gold-100 ring-1 ring-gold-300/20">
                  {usuario.nombre.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">
                    {usuario.nombre}
                  </span>
                  <span className="block truncate text-[10px] text-[#aeb9cc]">
                    {ROL_LABEL[usuario.rol]}
                  </span>
                </span>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <BotonSalir className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#c6cfdd] transition hover:bg-white/[0.08] hover:text-white">
                  Salir
                </BotonSalir>
              </div>
            </div>
          ) : (
            <span className="mx-auto block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          )}
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${mobileOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 bg-black/48 backdrop-blur-sm transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`relative flex h-full w-[282px] max-w-[84vw] flex-col overflow-hidden border-r border-gold-300/10 bg-[#0b1324] shadow-2xl transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_top,rgba(218,181,94,0.13),transparent_65%)]" />
          <div className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-4">
            <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
              <img
                src="/logo-americana.png"
                alt="Escudo Corporacion Universitaria Americana"
                width={40}
                height={53}
                className="h-8 w-auto shrink-0 drop-shadow-[0_0_14px_rgba(218,181,94,0.42)]"
              />
              <span className="leading-none">
                <span className="block text-[15px] font-bold tracking-wide text-white">
                  Paz y Salvo
                </span>
                <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.22em] text-[#d8c38d]">
                  Americana
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="Cerrar menu"
              onClick={() => setMobileOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Icon name="close" />
            </button>
          </div>
          <SidebarContent
            collapsed={false}
            mobile
            sections={sections}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-silver-200/70 bg-white/78 px-4 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-navy-700 ring-1 ring-silver-200 transition hover:bg-white hover:ring-gold-300 lg:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-3 sm:flex">
              <img
                src="/logo-americana.png"
                alt="Escudo Corporacion Universitaria Americana"
                width={34}
                height={45}
                className="h-8 w-auto shrink-0 drop-shadow-[0_0_9px_rgba(218,181,94,0.38)]"
              />
              <span className="h-10 w-px bg-gradient-to-b from-transparent via-silver-300 to-transparent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-silver-600 sm:block">
                  {info.section}
                </span>
                <span className="hidden text-silver-300 sm:block">/</span>
                <span className="truncate text-sm font-bold tracking-tight text-navy-900">
                  {info.title}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-silver-600">
                <span className="live-dot" />
                Tramite institucional en linea
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-xs font-semibold text-navy-900">{usuario.nombre}</p>
              <p className="text-[11px] text-silver-600">{ROL_LABEL[usuario.rol]}</p>
            </div>
            <BotonSalir className="hidden rounded-lg border border-silver-200 bg-white/82 px-3 py-1.5 text-xs font-semibold text-silver-600 shadow-sm transition hover:border-gold-300 hover:text-navy-900 sm:inline-flex">
              Salir
            </BotonSalir>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1500px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
