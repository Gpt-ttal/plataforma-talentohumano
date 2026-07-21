import { describe, expect, it } from "vitest"
import type { EstadoArea } from "@pys/shared"
import { decidirRecalculo } from "../src/infrastructure/db/recomputarEstado"

// I3 (auditoría Sesión 39): `recomputarEstadoEnLote` reemplazó el loop
// `for (f) await recomputarEstado(f)` de `crearArea`/`cambiarActivaArea` (~1.600
// queries) por 2 lecturas + escrituras agrupadas. La EQUIVALENCIA con el camino
// individual está garantizada por construcción: ambos derivan su decisión de la
// misma función pura `decidirRecalculo`. Estos tests fijan su contrato — cubren
// la matriz de la máquina de estados + la regla de limpieza de hitos.

const HITOS_VACIOS = { fechaLiquidacionGenerada: null, fechaLiquidacion: null }
const AYER = new Date("2026-07-03T10:00:00.000Z")

function estados(...e: EstadoArea[]): EstadoArea[] {
  return e
}

describe("decidirRecalculo · núcleo compartido del recálculo (I3)", () => {
  it("todas OK sin hitos → LISTO_PARA_LIQUIDAR, sin limpieza", () => {
    const r = decidirRecalculo(estados("APROBADO", "NO_APLICA"), HITOS_VACIOS)
    expect(r).toEqual({
      estadoGlobal: "LISTO_PARA_LIQUIDAR",
      hayRechazo: false,
      hayDevolucion: false,
      limpiarHitos: false,
    })
  })

  it("todas OK + liquidación generada → LIQUIDACION_GENERADA, conserva hitos", () => {
    const r = decidirRecalculo(estados("APROBADO", "APROBADO"), {
      fechaLiquidacionGenerada: AYER,
      fechaLiquidacion: null,
    })
    expect(r.estadoGlobal).toBe("LIQUIDACION_GENERADA")
    expect(r.limpiarHitos).toBe(false)
  })

  it("todas OK + liquidado → PAZ_Y_SALVO, conserva hitos", () => {
    const r = decidirRecalculo(estados("APROBADO", "NO_APLICA"), {
      fechaLiquidacionGenerada: AYER,
      fechaLiquidacion: AYER,
    })
    expect(r.estadoGlobal).toBe("PAZ_Y_SALVO")
    expect(r.limpiarHitos).toBe(false)
  })

  it("un área PENDIENTE → PENDIENTE + limpieza, aunque haya hitos previos", () => {
    const r = decidirRecalculo(estados("APROBADO", "PENDIENTE"), {
      fechaLiquidacionGenerada: AYER,
      fechaLiquidacion: AYER,
    })
    expect(r.estadoGlobal).toBe("PENDIENTE")
    expect(r.limpiarHitos).toBe(true)
  })

  it("un área NO_APROBADO → PENDIENTE, marca hayRechazo y limpia", () => {
    const r = decidirRecalculo(estados("APROBADO", "NO_APROBADO"), HITOS_VACIOS)
    expect(r).toEqual({
      estadoGlobal: "PENDIENTE",
      hayRechazo: true,
      hayDevolucion: false,
      limpiarHitos: true,
    })
  })

  it("un área DEVUELTO_POR_CI → PENDIENTE, marca hayDevolucion (no hayRechazo) y limpia", () => {
    const r = decidirRecalculo(estados("APROBADO", "DEVUELTO_POR_CI"), {
      fechaLiquidacionGenerada: AYER,
      fechaLiquidacion: null,
    })
    expect(r).toEqual({
      estadoGlobal: "PENDIENTE",
      hayRechazo: false,
      hayDevolucion: true,
      limpiarHitos: true,
    })
  })

  it("DEVUELTO_POR_CI vuelve a APROBADO → deja de bloquear, sin devolución", () => {
    const r = decidirRecalculo(estados("APROBADO", "APROBADO"), HITOS_VACIOS)
    expect(r.estadoGlobal).toBe("LISTO_PARA_LIQUIDAR")
    expect(r.hayDevolucion).toBe(false)
    expect(r.limpiarHitos).toBe(false)
  })

  it("sin áreas activas → PENDIENTE + limpieza (no se libera a nadie sin visto bueno)", () => {
    const r = decidirRecalculo([], HITOS_VACIOS)
    expect(r).toEqual({
      estadoGlobal: "PENDIENTE",
      hayRechazo: false,
      hayDevolucion: false,
      limpiarHitos: true,
    })
  })
})
