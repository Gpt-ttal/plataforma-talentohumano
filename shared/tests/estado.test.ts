import { describe, it, expect } from "vitest";
import { calcularEstadoGlobal } from "../src/estado";
import type { EstadoArea } from "../src/domain";

const A = (...estados: EstadoArea[]) => estados;

describe("calcularEstadoGlobal", () => {
  it("todas APROBADO, sin generar y sin liquidar => LISTO_PARA_LIQUIDAR", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "APROBADO", "APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("LISTO_PARA_LIQUIDAR");
    expect(r.hayRechazo).toBe(false);
  });

  it("todas OK + TH generó (sin cerrar) => LIQUIDACION_GENERADA", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APLICA", "APROBADO"),
      liquidacionGenerada: true,
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("LIQUIDACION_GENERADA");
    expect(r.hayRechazo).toBe(false);
  });

  it("todas APROBADO y liquidado => PAZ_Y_SALVO", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "APROBADO"),
      liquidacionGenerada: true,
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PAZ_Y_SALVO");
    expect(r.hayRechazo).toBe(false);
  });

  it("liquidado tiene prioridad sobre liquidacionGenerada => PAZ_Y_SALVO", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "APROBADO"),
      liquidacionGenerada: false,
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PAZ_Y_SALVO");
  });

  it("mezcla de APROBADO y NO_APLICA cuenta como todas OK", () => {
    expect(
      calcularEstadoGlobal({
        estadosAreas: A("APROBADO", "NO_APLICA", "APROBADO"),
        liquidacionGenerada: false,
        liquidado: false,
      }).estadoGlobal,
    ).toBe("LISTO_PARA_LIQUIDAR");

    expect(
      calcularEstadoGlobal({
        estadosAreas: A("APROBADO", "NO_APLICA"),
        liquidacionGenerada: true,
        liquidado: true,
      }).estadoGlobal,
    ).toBe("PAZ_Y_SALVO");
  });

  it("todas NO_APLICA cuenta como todas OK", () => {
    expect(
      calcularEstadoGlobal({
        estadosAreas: A("NO_APLICA", "NO_APLICA", "NO_APLICA"),
        liquidacionGenerada: false,
        liquidado: false,
      }).estadoGlobal,
    ).toBe("LISTO_PARA_LIQUIDAR");
  });

  it("alguna PENDIENTE => PENDIENTE (aunque el resto esté OK)", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "PENDIENTE", "APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
    expect(r.hayRechazo).toBe(false);
  });

  it("regresión: un área devuelta a PENDIENTE anula la generación => PENDIENTE", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "PENDIENTE", "APROBADO"),
      liquidacionGenerada: true, // TH ya había generado, pero un área regresó
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });

  it("una PENDIENTE no se convierte en PAZ_Y_SALVO aunque esté liquidado", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "PENDIENTE"),
      liquidacionGenerada: true,
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });

  it("alguna NO_APROBADO => PENDIENTE con hayRechazo=true", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APROBADO", "APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
    expect(r.hayRechazo).toBe(true);
  });

  it("NO_APROBADO no se convierte en PAZ_Y_SALVO aunque esté liquidado", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APROBADO"),
      liquidacionGenerada: true,
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
    expect(r.hayRechazo).toBe(true);
  });

  it("lista de áreas vacía => PENDIENTE (no hay nada que liberar)", () => {
    expect(
      calcularEstadoGlobal({
        estadosAreas: [],
        liquidacionGenerada: false,
        liquidado: false,
      }).estadoGlobal,
    ).toBe("PENDIENTE");
    expect(
      calcularEstadoGlobal({
        estadosAreas: [],
        liquidacionGenerada: true,
        liquidado: true,
      }).estadoGlobal,
    ).toBe("PENDIENTE");
  });

  it("hayRechazo es true si existe al menos un NO_APROBADO, incluso con pendientes", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("PENDIENTE", "NO_APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.hayRechazo).toBe(true);
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });

  it("DEVUELTO_POR_CI bloquea igual que NO_APROBADO => PENDIENTE", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "DEVUELTO_POR_CI", "APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });

  it("DEVUELTO_POR_CI no se convierte en PAZ_Y_SALVO aunque esté liquidado", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "DEVUELTO_POR_CI"),
      liquidacionGenerada: true,
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });

  it("hayDevolucion es true solo con DEVUELTO_POR_CI, distinto de hayRechazo", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "DEVUELTO_POR_CI"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.hayDevolucion).toBe(true);
    expect(r.hayRechazo).toBe(false);
  });

  it("hayRechazo es true solo con NO_APROBADO, distinto de hayDevolucion", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.hayRechazo).toBe(true);
    expect(r.hayDevolucion).toBe(false);
  });

  it("hayDevolucion y hayRechazo pueden ser ambos true (una devuelta y otra rechazada)", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("DEVUELTO_POR_CI", "NO_APROBADO"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.hayDevolucion).toBe(true);
    expect(r.hayRechazo).toBe(true);
  });

  it("sin DEVUELTO_POR_CI ni NO_APROBADO, ambos flags en false", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APLICA"),
      liquidacionGenerada: false,
      liquidado: false,
    });
    expect(r.hayRechazo).toBe(false);
    expect(r.hayDevolucion).toBe(false);
  });
});
