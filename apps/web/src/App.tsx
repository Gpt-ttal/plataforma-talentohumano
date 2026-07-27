import { lazy, Suspense, type ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { rutaInicialPorRol } from "@pys/shared"
import { queryClient } from "./lib/queryClient"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { PaletteProvider } from "./context/PaletteContext"
import { Layout } from "./components/Layout"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { RoleSwitcher } from "./components/dev/RoleSwitcher"
import { CallbackPage } from "./pages/auth/CallbackPage"
import { LoginPage } from "./pages/login/LoginPage"
import { PendientePage } from "./pages/pendiente/PendientePage"
import { ControlInternoPage } from "./pages/funcionarios/ControlInternoPage"
import { FuncionarioModal } from "./pages/funcionarios/FuncionarioModal"
import { MiAreaPage } from "./pages/miarea/MiAreaPage"
import { MatrizPage } from "./pages/matriz/MatrizPage"
import { UsuariosPage } from "./pages/usuarios/UsuariosPage"
import { AreasPage } from "./pages/areas/AreasPage"
import { ConfiguracionLayout } from "./pages/configuracion/ConfiguracionLayout"
import { GeneralPage } from "./pages/configuracion/GeneralPage"
import { AparienciaPage } from "./pages/configuracion/AparienciaPage"
import { SeguridadPage } from "./pages/configuracion/SeguridadPage"
import { SistemaPage } from "./pages/configuracion/SistemaPage"
import { UsuariosConfigPage } from "./pages/configuracion/UsuariosConfigPage"
import { RolesPage } from "./pages/configuracion/RolesPage"
import { CatalogosPage } from "./pages/configuracion/CatalogosPage"
import { PanelControlPage } from "./pages/panel/PanelControlPage"
import { ArchivoPage } from "./pages/archivo/ArchivoPage"
import { ExpedienteModal } from "./pages/archivo/ExpedienteModal"
import { CapacitacionesPage } from "./pages/capacitaciones/CapacitacionesPage"
import { CapacitacionModal } from "./pages/capacitaciones/CapacitacionModal"
import { RegistroAsistenciaPage } from "./pages/asistencia/RegistroAsistenciaPage"
import { PersonalPage } from "./pages/personal/PersonalPage"
import { ExpedienteEmpleadoModal } from "./pages/personal/ExpedienteEmpleadoModal"
import { ImportacionPage } from "./pages/desvinculaciones/ImportacionPage"
import { VacantesPage } from "./pages/vacantes/VacantesPage"
import { VacantesResumenPage } from "./pages/vacantes/VacantesResumenPage"
import { VacanteModal } from "./pages/vacantes/VacanteModal"
// Cursos & Planificador se cargan bajo demanda: Tiptap (editor de lecciones) y su
// vendor solo se descargan al entrar al módulo, no en el arranque ni en el login.
const CursosPage = lazy(() =>
  import("./pages/cursos/CursosPage").then((m) => ({ default: m.CursosPage })),
)
const CursoDetallePage = lazy(() =>
  import("./pages/cursos/CursoDetallePage").then((m) => ({ default: m.CursoDetallePage })),
)
const PlanificadorPage = lazy(() =>
  import("./pages/planificador/PlanificadorPage").then((m) => ({ default: m.PlanificadorPage })),
)
const TomarCursoPage = lazy(() =>
  import("./pages/tomar-curso/TomarCursoPage").then((m) => ({ default: m.TomarCursoPage })),
)

/** Frontera de carga para las rutas diferidas (Cursos/Planificador/Tomar curso). */
function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center text-sm text-muted">Cargando…</div>
      }
    >
      {children}
    </Suspense>
  )
}

function NoAccess() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Sin acceso
      </h1>
      <p className="text-sm text-muted">
        Tu rol no tiene permiso para ver esta sección.
      </p>
    </div>
  )
}

/**
 * Redirige la raíz `/` según el rol y estado del usuario autenticado.
 * Mientras la sesión se resuelve, espera sin renderizar nada.
 */
function RootRedirect() {
  const { usuario, isLoading } = useAuth()
  if (isLoading) return null
  if (!usuario) return <Navigate to="/login" replace />
  return <Navigate to={rutaInicialPorRol(usuario.rol, usuario.estado)} replace />
}

/**
 * Raíz del SPA: providers (Query → Auth → Router) y rutas por rol. Las guardas de
 * `ProtectedRoute` reflejan la autorización; el backend la garantiza.
 *
 * Estructura de namespaces:
 *  - `/inicio`            → Panel de control de la plataforma (SA y TH)
 *  - `/paz-y-salvo/*`    → módulo Paz y Salvo (todos los roles, según guarda)
 *  - `/usuarios`         → gestión de usuarios (solo SA)
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaletteProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
            {/* Públicas / semi-públicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<CallbackPage />} />
            <Route path="/pendiente" element={<PendientePage />} />
            <Route path="/no-access" element={<NoAccess />} />
            {/* Registro de asistencia por QR — sin auth, sin Layout */}
            <Route path="/asistencia/:token" element={<RegistroAsistenciaPage />} />
            {/* Tomar curso por cédula — sin auth, sin Layout */}
            <Route
              path="/tomar-curso/:token"
              element={
                <Lazy>
                  <TomarCursoPage />
                </Lazy>
              }
            />

            {/* Protegidas (envueltas por el layout con sidebar por rol) */}
            <Route element={<Layout />}>
              {/* Raíz: redirige por rol (resuelto tras carga de sesión) */}
              <Route path="/" element={<RootRedirect />} />

              {/* Plataforma — Panel de control (solo SA y TH) */}
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <PanelControlPage />
                  </ProtectedRoute>
                }
              />

              {/* Módulo Paz y Salvo — el dashboard se fusionó en el Panel de
                  control (`/inicio`); la raíz del módulo redirige allí. */}
              <Route path="/paz-y-salvo" element={<Navigate to="/inicio" replace />} />

              {/* Oficina de Control Interno — finaliza el trámite (paz y salvo). */}
              <Route
                path="/paz-y-salvo/control-interno"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "CONTROL_INTERNO"]}>
                    <ControlInternoPage />
                  </ProtectedRoute>
                }
              >
                <Route path=":id" element={<FuncionarioModal />} />
              </Route>
              <Route
                path="/paz-y-salvo/mi-area"
                element={
                  <ProtectedRoute roles={["AREA", "SUPERADMIN"]}>
                    <MiAreaPage />
                  </ProtectedRoute>
                }
              />

              {/* Avance por área — matriz consolidada funcionario × área. Oficina de
                  SUPERADMIN y TALENTO_HUMANO (sus catálogos dedicados se retiraron por
                  redundancia); CONTROL_INTERNO la usa solo como vista de supervisión. */}
              <Route
                path="/paz-y-salvo/avance"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"]}>
                    <MatrizPage />
                  </ProtectedRoute>
                }
              >
                {/* La hija hereda la guarda del padre vía Outlet. */}
                <Route path=":id" element={<FuncionarioModal />} />
              </Route>

              {/* Archivo institucional — plataforma de gestión (SA + TH). */}
              <Route
                path="/archivo"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <ArchivoPage />
                  </ProtectedRoute>
                }
              >
                {/* La hija hereda la guarda del padre vía Outlet. */}
                <Route path=":id" element={<ExpedienteModal />} />
              </Route>

              {/* Capacitaciones — SA, TH y SST */}
              <Route
                path="/capacitaciones"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO", "SST"]}>
                    <CapacitacionesPage />
                  </ProtectedRoute>
                }
              >
                <Route path=":id" element={<CapacitacionModal />} />
              </Route>

              {/* Cursos — SA, TH y SST. Página dedicada: `/cursos/:id` es hermana
                  top-level (no hija anidada), por eso CursosPage no lleva <Outlet/>. */}
              <Route
                path="/cursos"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO", "SST"]}>
                    <Lazy>
                      <CursosPage />
                    </Lazy>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cursos/:id"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO", "SST"]}>
                    <Lazy>
                      <CursoDetallePage />
                    </Lazy>
                  </ProtectedRoute>
                }
              />

              {/* Planificador de capacitaciones — SA, TH y SST */}
              <Route
                path="/planificador"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO", "SST"]}>
                    <Lazy>
                      <PlanificadorPage />
                    </Lazy>
                  </ProtectedRoute>
                }
              />

              {/* Administración de Personal — maestro de empleados (SA + TH). El
                  expediente 360° es un modal por ruta hija (`:id`) sobre el maestro. */}
              <Route
                path="/personal"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <PersonalPage />
                  </ProtectedRoute>
                }
              >
                <Route path=":id" element={<ExpedienteEmpleadoModal />} />
              </Route>

              {/* Vacantes — seguimiento de procesos de contratación (SA + TH). El
                  detalle es un modal por ruta hija (`:id`) sobre el listado; el
                  resumen es hermano estático top-level (gana a `:id` en RRv6). */}
              <Route
                path="/vacantes"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <VacantesPage />
                  </ProtectedRoute>
                }
              >
                <Route path=":id" element={<VacanteModal />} />
              </Route>
              <Route
                path="/vacantes/resumen"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <VacantesResumenPage />
                  </ProtectedRoute>
                }
              />

              {/* Importación masiva de desvinculaciones — SA + TH */}
              <Route
                path="/desvinculaciones/importacion"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <ImportacionPage />
                  </ProtectedRoute>
                }
              />

              {/* Gestión de usuarios — solo SA */}
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute roles={["SUPERADMIN"]}>
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />

              {/* Catálogo de áreas — solo SA */}
              <Route
                path="/areas"
                element={
                  <ProtectedRoute roles={["SUPERADMIN"]}>
                    <AreasPage />
                  </ProtectedRoute>
                }
              />

              {/* Configuración — suite de ajustes (todos los roles activos; las
                  sub-páginas de gobierno se ocultan por rol y las guarda el backend).
                  El índice redirige a la primera sub-página visible para cualquiera. */}
              <Route
                path="/configuracion"
                element={
                  <ProtectedRoute
                    roles={[
                      "SUPERADMIN",
                      "TALENTO_HUMANO",
                      "CONTROL_INTERNO",
                      "AREA",
                      "SST",
                    ]}
                  >
                    <ConfiguracionLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/configuracion/general" replace />} />
                <Route path="general" element={<GeneralPage />} />
                <Route path="apariencia" element={<AparienciaPage />} />
                <Route path="seguridad" element={<SeguridadPage />} />
                {/* Sistema: detalle de infraestructura → solo SA y TH. */}
                <Route
                  path="sistema"
                  element={
                    <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                      <SistemaPage />
                    </ProtectedRoute>
                  }
                />
                {/* Usuarios: gobierno de acceso (allowlist + roles) — solo SA. La
                    guarda de rol la reaplica el backend en cada endpoint. */}
                <Route
                  path="usuarios"
                  element={
                    <ProtectedRoute roles={["SUPERADMIN"]}>
                      <UsuariosConfigPage />
                    </ProtectedRoute>
                  }
                />
                {/* Matriz RBAC editable — solo SA. */}
                <Route
                  path="roles"
                  element={
                    <ProtectedRoute roles={["SUPERADMIN"]}>
                      <RolesPage />
                    </ProtectedRoute>
                  }
                />
                {/* Catálogos (áreas de visto bueno y más) — solo SA. */}
                <Route
                  path="catalogos"
                  element={
                    <ProtectedRoute roles={["SUPERADMIN"]}>
                      <CatalogosPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster richColors position="top-right" />
            <RoleSwitcher />
          </BrowserRouter>
        </AuthProvider>
        </PaletteProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
