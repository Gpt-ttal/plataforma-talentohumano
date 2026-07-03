import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { rutaInicialPorRol } from "@pys/shared"
import { queryClient } from "./lib/queryClient"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { Layout } from "./components/Layout"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { RoleSwitcher } from "./components/dev/RoleSwitcher"
import { CallbackPage } from "./pages/auth/CallbackPage"
import { LoginPage } from "./pages/login/LoginPage"
import { PendientePage } from "./pages/pendiente/PendientePage"
import { FuncionariosPage } from "./pages/funcionarios/FuncionariosPage"
import { TalentoHumanoPage } from "./pages/funcionarios/TalentoHumanoPage"
import { ControlInternoPage } from "./pages/funcionarios/ControlInternoPage"
import { FuncionarioModal } from "./pages/funcionarios/FuncionarioModal"
import { MiAreaPage } from "./pages/miarea/MiAreaPage"
import { MatrizPage } from "./pages/matriz/MatrizPage"
import { UsuariosPage } from "./pages/usuarios/UsuariosPage"
import { AreasPage } from "./pages/areas/AreasPage"
import { PanelControlPage } from "./pages/panel/PanelControlPage"
import { ArchivoPage } from "./pages/archivo/ArchivoPage"
import { ExpedienteModal } from "./pages/archivo/ExpedienteModal"
import { CapacitacionesPage } from "./pages/capacitaciones/CapacitacionesPage"
import { CapacitacionModal } from "./pages/capacitaciones/CapacitacionModal"
import { RegistroAsistenciaPage } from "./pages/asistencia/RegistroAsistenciaPage"
import { PersonalPage } from "./pages/personal/PersonalPage"
import { ExpedientePage } from "./pages/personal/ExpedientePage"

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

              {/* Catálogo de supervisión — solo SUPERADMIN (TH y CI tienen oficina propia). */}
              <Route
                path="/paz-y-salvo/funcionarios"
                element={
                  <ProtectedRoute roles={["SUPERADMIN"]}>
                    <FuncionariosPage />
                  </ProtectedRoute>
                }
              >
                {/* La hija hereda la guarda del padre vía Outlet (no lleva ProtectedRoute propio). */}
                <Route path=":id" element={<FuncionarioModal />} />
              </Route>

              {/* Oficina de Talento Humano — genera liquidación. */}
              <Route
                path="/paz-y-salvo/talento-humano"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <TalentoHumanoPage />
                  </ProtectedRoute>
                }
              >
                <Route path=":id" element={<FuncionarioModal />} />
              </Route>

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

              {/* Avance por área — matriz consolidada funcionario × área (supervisores). */}
              <Route
                path="/paz-y-salvo/avance"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO"]}>
                    <MatrizPage />
                  </ProtectedRoute>
                }
              />

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

              {/* Administración de Personal — maestro de empleados (SA + TH) */}
              <Route
                path="/personal"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <PersonalPage />
                  </ProtectedRoute>
                }
              />
              {/* Expediente 360° (hoja de vida completa) — ruta propia */}
              <Route
                path="/personal/:id"
                element={
                  <ProtectedRoute roles={["SUPERADMIN", "TALENTO_HUMANO"]}>
                    <ExpedientePage />
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster richColors position="top-right" />
            <RoleSwitcher />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
