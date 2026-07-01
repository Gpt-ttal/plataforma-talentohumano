import { describe, it, expect } from "vitest"
import {
  ambitoPorDefecto,
  ambitosVisibles,
  construirCsvAsistencias,
  normalizarDocumento,
  puedeGestionarAmbito,
  registroAbierto,
} from "../src/capacitaciones"
import type { Asistencia } from "../src/capacitaciones"

describe("ambitoPorDefecto", () => {
  it("TH crea de ámbito TH; SST de ámbito SST", () => {
    expect(ambitoPorDefecto("TALENTO_HUMANO")).toBe("TH")
    expect(ambitoPorDefecto("SST")).toBe("SST")
  })
  it("el SUPERADMIN no tiene ámbito propio (debe especificarlo)", () => {
    expect(ambitoPorDefecto("SUPERADMIN")).toBeNull()
  })
  it("roles sin acceso al módulo no tienen ámbito por defecto", () => {
    expect(ambitoPorDefecto("CONTROL_INTERNO")).toBeNull()
    expect(ambitoPorDefecto("AREA")).toBeNull()
  })
})

describe("puedeGestionarAmbito", () => {
  it("el SUPERADMIN gestiona todos los ámbitos", () => {
    expect(puedeGestionarAmbito("SUPERADMIN", "TH")).toBe(true)
    expect(puedeGestionarAmbito("SUPERADMIN", "SST")).toBe(true)
  })
  it("TH solo gestiona TH; SST solo gestiona SST", () => {
    expect(puedeGestionarAmbito("TALENTO_HUMANO", "TH")).toBe(true)
    expect(puedeGestionarAmbito("TALENTO_HUMANO", "SST")).toBe(false)
    expect(puedeGestionarAmbito("SST", "SST")).toBe(true)
    expect(puedeGestionarAmbito("SST", "TH")).toBe(false)
  })
  it("roles ajenos al módulo no gestionan ningún ámbito", () => {
    expect(puedeGestionarAmbito("CONTROL_INTERNO", "TH")).toBe(false)
    expect(puedeGestionarAmbito("AREA", "SST")).toBe(false)
  })
})

describe("ambitosVisibles", () => {
  it("el SA ve ambos; TH y SST solo el suyo; el resto ninguno", () => {
    expect(ambitosVisibles("SUPERADMIN")).toEqual(["TH", "SST"])
    expect(ambitosVisibles("TALENTO_HUMANO")).toEqual(["TH"])
    expect(ambitosVisibles("SST")).toEqual(["SST"])
    expect(ambitosVisibles("CONTROL_INTERNO")).toEqual([])
    expect(ambitosVisibles("AREA")).toEqual([])
  })
})

describe("registroAbierto", () => {
  it("solo ABIERTO acepta nuevos asistentes", () => {
    expect(registroAbierto("ABIERTO")).toBe(true)
    expect(registroAbierto("BORRADOR")).toBe(false)
    expect(registroAbierto("CERRADO")).toBe(false)
  })
})

describe("normalizarDocumento", () => {
  it("quita puntos, guiones y espacios de una cédula", () => {
    expect(normalizarDocumento("1.234.567")).toBe("1234567")
    expect(normalizarDocumento("1 234 567")).toBe("1234567")
    expect(normalizarDocumento("1-234-567")).toBe("1234567")
  })
  it("pasa a mayúsculas los pasaportes alfanuméricos", () => {
    expect(normalizarDocumento("abc-123")).toBe("ABC123")
    expect(normalizarDocumento("p a 1234")).toBe("PA1234")
  })
  it("colapsa grafías distintas de la misma cédula a la forma canónica", () => {
    expect(normalizarDocumento("1.234.567")).toBe(normalizarDocumento("1234567"))
  })
})

describe("construirCsvAsistencias", () => {
  const asistencia = (over: Partial<Asistencia>): Asistencia => ({
    id: "x",
    capacitacionId: "c1",
    nombre: "Ana Pérez",
    documento: "123",
    correo: "ana@x.co",
    dependencia: "Sistemas",
    tipoVinculo: "PLANTA",
    usuarioId: null,
    registradaEn: "2026-06-26T14:30:00.000Z",
    ...over,
  })

  it("incluye encabezado y una fila por asistente", () => {
    const csv = construirCsvAsistencias([asistencia({})])
    const lineas = csv.split("\n")
    expect(lineas[0]).toBe("Nombre,Documento,Correo,Dependencia,Vínculo,Registrada")
    expect(lineas).toHaveLength(2)
    expect(lineas[1]).toContain("Ana Pérez")
    expect(lineas[1]).toContain("Planta")
  })

  it("escapa campos con coma entrecomillando", () => {
    const csv = construirCsvAsistencias([
      asistencia({ nombre: "Pérez, Ana", dependencia: "Bienestar, SST" }),
    ])
    expect(csv).toContain('"Pérez, Ana"')
    expect(csv).toContain('"Bienestar, SST"')
  })

  it("deja vacíos los campos opcionales nulos sin romper la fila", () => {
    const csv = construirCsvAsistencias([
      asistencia({ correo: null, dependencia: null }),
    ])
    const fila = csv.split("\n")[1]
    // Nombre,Documento,,,Vínculo,Registrada → dos campos vacíos consecutivos
    expect(fila).toContain("123,,,")
  })

  it("sin asistencias devuelve solo el encabezado", () => {
    expect(construirCsvAsistencias([])).toBe(
      "Nombre,Documento,Correo,Dependencia,Vínculo,Registrada",
    )
  })
})
