import { describe, it, expect } from "vitest"
import { modulosParaRol } from "@pys/shared"
import { sectionsForRole } from "../src/components/Layout"

const PLATAFORMA = ["SUPERADMIN", "TALENTO_HUMANO"] as const

describe("coherencia MODULOS ↔ sidebar", () => {
  it.each(PLATAFORMA)("el sidebar de %s cubre sus módulos ACTIVO", (rol) => {
    const hrefs = sectionsForRole(rol).flatMap((s) => s.items.map((i) => i.href))
    const faltantes = modulosParaRol(rol)
      .filter((m) => m.estado === "ACTIVO")
      .filter((m) => !hrefs.some((h) => h.startsWith(m.rutaBase)))
      .map((m) => m.id)
    expect(faltantes).toEqual([])
  })
})
