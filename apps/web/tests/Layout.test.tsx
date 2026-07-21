import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { Usuario } from "@pys/shared"
import { Layout } from "../src/components/Layout"

const useAuthMock = vi.fn()

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock("../src/context/ThemeContext", () => ({
  useTheme: () => ({ esDark: false, alternar: vi.fn() }),
}))

function usuario(parche: Partial<Usuario> = {}): Usuario {
  return {
    id: "u1",
    email: "leonardoreales@americana.edu.co",
    nombre: "Leonardo",
    rol: "SUPERADMIN",
    areaId: null,
    estado: "ACTIVO",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...parche,
  }
}

function renderEn(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/inicio" element={<p>Panel</p>} />
          <Route path="/paz-y-salvo/mi-area" element={<p>Mi area</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthMock.mockReset()
})

describe("Layout", () => {
  it("muestra a SUPERADMIN el acceso directo a Activos fijos", () => {
    useAuthMock.mockReturnValue({
      usuario: usuario({ rol: "SUPERADMIN", areaId: null }),
      logout: vi.fn(),
    })

    renderEn("/inicio")

    const link = screen.getByRole("link", { name: /Activos fijos/i })
    expect(link).toHaveAttribute("href", "/paz-y-salvo/mi-area?area=1")
  })
})
