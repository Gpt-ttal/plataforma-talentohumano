import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  ESTADOS_AREA,
  ESTADOS_GLOBAL,
  ESTADO_AREA_LABEL,
  ESTADO_GLOBAL_LABEL,
} from "@pys/shared"
import { EstadoAreaPill, EstadoGlobalPill } from "../src/components/ui/EstadoPill"

describe("EstadoPill", () => {
  it("renderiza la etiqueta correcta para cada estado global", () => {
    for (const estado of ESTADOS_GLOBAL) {
      const { unmount } = render(<EstadoGlobalPill estado={estado} />)
      expect(screen.getByText(ESTADO_GLOBAL_LABEL[estado])).toBeInTheDocument()
      unmount()
    }
  })

  it("renderiza la etiqueta correcta para cada estado de área", () => {
    for (const estado of ESTADOS_AREA) {
      const { unmount } = render(<EstadoAreaPill estado={estado} />)
      expect(screen.getByText(ESTADO_AREA_LABEL[estado])).toBeInTheDocument()
      unmount()
    }
  })
})
