import { describe, it, expect } from "vitest"
import { MODULOS } from "@pys/shared"
import { ICONOS_DISPONIBLES } from "../src/components/ui/dash/Icon"

describe("coherencia MODULOS ↔ iconos del Panel", () => {
  it("todo MODULOS[].icono existe en el set de iconos disponibles", () => {
    const rotos = MODULOS.filter((m) => !ICONOS_DISPONIBLES.has(m.icono)).map(
      (m) => `${m.id}:${m.icono}`,
    )
    expect(rotos).toEqual([])
  })
})
