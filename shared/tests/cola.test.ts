import { describe, it, expect } from "vitest"
import { esGestionado, particionarCola } from "../src/cola"
import type { FilaGestionArea, Funcionario } from "../src/domain"

function fila(estado: FilaGestionArea["estado"], doc: string): FilaGestionArea {
  const funcionario = { id: doc, documento: doc, nombreCompleto: `F ${doc}` } as Funcionario
  return { funcionario, estado }
}

describe("esGestionado (un área deja de estar por gestionar cuando no está PENDIENTE)", () => {
  it("PENDIENTE no está gestionado", () => {
    expect(esGestionado("PENDIENTE")).toBe(false)
  })
  it.each(["APROBADO", "NO_APLICA", "NO_APROBADO"] as const)(
    "%s cuenta como gestionado",
    (estado) => {
      expect(esGestionado(estado)).toBe(true)
    },
  )
})

describe("particionarCola (corte por bucket + contadores)", () => {
  const filas = [
    fila("PENDIENTE", "1"),
    fila("PENDIENTE", "2"),
    fila("APROBADO", "3"),
    fila("NO_APLICA", "4"),
    fila("NO_APROBADO", "5"),
  ]

  it("los contadores cubren el TOTAL del área, no la página", () => {
    const r = particionarCola(filas, { porPagina: 2 })
    expect(r.conteos).toEqual({ pendientes: 2, gestionados: 3, total: 5 })
  })

  it("bucket 'pendientes' solo devuelve PENDIENTE", () => {
    const r = particionarCola(filas, { bucket: "pendientes" })
    expect(r.items.map((f) => f.estado)).toEqual(["PENDIENTE", "PENDIENTE"])
    expect(r.total).toBe(2)
  })

  it("bucket 'gestionados' devuelve todo lo que no es PENDIENTE", () => {
    const r = particionarCola(filas, { bucket: "gestionados" })
    expect(r.items.map((f) => f.estado)).toEqual(["APROBADO", "NO_APLICA", "NO_APROBADO"])
    expect(r.total).toBe(3)
  })

  it("bucket 'todos' (o ausente) devuelve la cola completa", () => {
    expect(particionarCola(filas).total).toBe(5)
    expect(particionarCola(filas, { bucket: "todos" }).total).toBe(5)
  })

  it("pagina dentro del bucket seleccionado", () => {
    const r = particionarCola(filas, { bucket: "gestionados", pagina: 2, porPagina: 2 })
    expect(r.pagina).toBe(2)
    expect(r.items.map((f) => f.estado)).toEqual(["NO_APROBADO"])
    expect(r.totalPaginas).toBe(2)
  })
})
