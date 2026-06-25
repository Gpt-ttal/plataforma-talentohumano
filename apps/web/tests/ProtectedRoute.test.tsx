import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { Usuario } from "@pys/shared"
import { ProtectedRoute } from "../src/components/ProtectedRoute"

// useAuth controlable por test.
const useAuthMock = vi.fn()
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}))

function usuario(over: Partial<Usuario> = {}): Usuario {
  return {
    id: "u1",
    email: "leonardoreales@americana.edu.co",
    nombre: "Leonardo",
    rol: "SUPERADMIN",
    areaId: null,
    estado: "ACTIVO",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...over,
  }
}

function renderEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>Pantalla login</p>} />
        <Route path="/pendiente" element={<p>Pantalla pendiente</p>} />
        <Route path="/no-access" element={<p>Sin acceso</p>} />
        <Route
          path="/"
          element={
            <ProtectedRoute roles={["SUPERADMIN"]}>
              <p>Dashboard protegido</p>
            </ProtectedRoute>
          }
        />
        <Route
          path="/funcionarios"
          element={
            <ProtectedRoute>
              <p>Funcionarios protegido</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => useAuthMock.mockReset())

describe("ProtectedRoute (guarda de UX por rol)", () => {
  it("sin usuario redirige a /login", () => {
    useAuthMock.mockReturnValue({ usuario: null, isLoading: false })
    renderEn("/")
    expect(screen.getByText("Pantalla login")).toBeInTheDocument()
  })

  it("usuario no ACTIVO redirige a /pendiente", () => {
    useAuthMock.mockReturnValue({ usuario: usuario({ estado: "PENDIENTE" }), isLoading: false })
    renderEn("/funcionarios")
    expect(screen.getByText("Pantalla pendiente")).toBeInTheDocument()
  })

  it("rol fuera del conjunto permitido redirige a /no-access", () => {
    useAuthMock.mockReturnValue({ usuario: usuario({ rol: "AREA" }), isLoading: false })
    renderEn("/")
    expect(screen.getByText("Sin acceso")).toBeInTheDocument()
  })

  it("rol permitido ve el contenido protegido", () => {
    useAuthMock.mockReturnValue({ usuario: usuario({ rol: "SUPERADMIN" }), isLoading: false })
    renderEn("/")
    expect(screen.getByText("Dashboard protegido")).toBeInTheDocument()
  })

  it("mientras carga no renderiza el contenido ni redirige", () => {
    useAuthMock.mockReturnValue({ usuario: null, isLoading: true })
    const { container } = renderEn("/")
    expect(container).toBeEmptyDOMElement()
  })
})
