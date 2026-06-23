import { describe, it, expect } from "vitest";
import { calcularEstadoGlobal } from "../lib/estado";
import type { EstadoArea } from "../lib/domain";

const A = (...estados: EstadoArea[]) => estados;

describe("calcularEstadoGlobal", () => {
  it("todas APROBADO y sin liquidar => LISTO_PARA_LIQUIDAR", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "APROBADO", "APROBADO"),
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("LISTO_PARA_LIQUIDAR");
    expect(r.hayRechazo).toBe(false);
  });

  it("todas APROBADO y liquidado => PAZ_Y_SALVO", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "APROBADO"),
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PAZ_Y_SALVO");
    expect(r.hayRechazo).toBe(false);
  });

  it("mezcla de APROBADO y NO_APLICA cuenta como todas OK", () => {
    expect(
      calcularEstadoGlobal({
        estadosAreas: A("APROBADO", "NO_APLICA", "APROBADO"),
        liquidado: false,
      }).estadoGlobal,
    ).toBe("LISTO_PARA_LIQUIDAR");

    expect(
      calcularEstadoGlobal({
        estadosAreas: A("APROBADO", "NO_APLICA"),
        liquidado: true,
      }).estadoGlobal,
    ).toBe("PAZ_Y_SALVO");
  });

  it("todas NO_APLICA cuenta como todas OK", () => {
    expect(
      calcularEstadoGlobal({
        estadosAreas: A("NO_APLICA", "NO_APLICA", "NO_APLICA"),
        liquidado: false,
      }).estadoGlobal,
    ).toBe("LISTO_PARA_LIQUIDAR");
  });

  it("alguna PENDIENTE => PENDIENTE (aunque el resto esté OK)", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "PENDIENTE", "APROBADO"),
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
    expect(r.hayRechazo).toBe(false);
  });

  it("una PENDIENTE no se convierte en PAZ_Y_SALVO aunque esté liquidado", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "PENDIENTE"),
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });

  it("alguna NO_APROBADO => PENDIENTE con hayRechazo=true", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APROBADO", "APROBADO"),
      liquidado: false,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
    expect(r.hayRechazo).toBe(true);
  });

  it("NO_APROBADO no se convierte en PAZ_Y_SALVO aunque esté liquidado", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("APROBADO", "NO_APROBADO"),
      liquidado: true,
    });
    expect(r.estadoGlobal).toBe("PENDIENTE");
    expect(r.hayRechazo).toBe(true);
  });

  it("lista de áreas vacía => PENDIENTE (no hay nada que liberar)", () => {
    expect(
      calcularEstadoGlobal({ estadosAreas: [], liquidado: false }).estadoGlobal,
    ).toBe("PENDIENTE");
    expect(
      calcularEstadoGlobal({ estadosAreas: [], liquidado: true }).estadoGlobal,
    ).toBe("PENDIENTE");
  });

  it("hayRechazo es true si existe al menos un NO_APROBADO, incluso con pendientes", () => {
    const r = calcularEstadoGlobal({
      estadosAreas: A("PENDIENTE", "NO_APROBADO"),
      liquidado: false,
    });
    expect(r.hayRechazo).toBe(true);
    expect(r.estadoGlobal).toBe("PENDIENTE");
  });
});
