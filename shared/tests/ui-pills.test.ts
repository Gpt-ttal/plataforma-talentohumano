import { describe, expect, it } from "vitest";
import { ESTADOS_AREA, ESTADOS_GLOBAL, ROLES_USUARIO } from "../src/domain";
import { ESTADOS_REGISTRO } from "../src/capacitaciones";
import {
  ESTADO_AREA_LABEL,
  ESTADO_GLOBAL_LABEL,
  ESTADO_REGISTRO_LABEL,
  ROL_LABEL,
  estadoAreaPill,
  estadoGlobalPill,
  estadoRegistroPill,
} from "../src/ui";

/**
 * Las pills se centralizan en ui.ts con clases LITERALES (Tailwind no admite
 * nombres construidos en runtime: si se construyeran, el purge las eliminaría).
 * Estos tests garantizan cobertura exhaustiva de cada estado y que la etiqueta
 * que devuelve la pill coincide con el mapa de etiquetas.
 */

describe("estadoGlobalPill", () => {
  it("cubre todos los estados globales con className y dot no vacíos", () => {
    for (const e of ESTADOS_GLOBAL) {
      const pill = estadoGlobalPill(e);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.dot.length).toBeGreaterThan(0);
      expect(pill.label).toBe(ESTADO_GLOBAL_LABEL[e]);
    }
  });

  it("usa los tokens del sistema C para los estados de cierre (info/ok)", () => {
    expect(estadoGlobalPill("LIQUIDACION_GENERADA").className).toContain(
      "estado-info",
    );
    expect(estadoGlobalPill("PAZ_Y_SALVO").className).toContain("estado-ok");
  });
});

describe("estadoAreaPill", () => {
  it("cubre todos los estados de área con className no vacío y etiqueta correcta", () => {
    for (const e of ESTADOS_AREA) {
      const pill = estadoAreaPill(e);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.label).toBe(ESTADO_AREA_LABEL[e]);
    }
  });

  it("APROBADO usa el verde 'ok' del sistema C", () => {
    expect(estadoAreaPill("APROBADO").className).toContain("estado-ok");
  });
});

describe("estadoRegistroPill", () => {
  it("cubre todos los estados de registro con className, dot y etiqueta", () => {
    for (const e of ESTADOS_REGISTRO) {
      const pill = estadoRegistroPill(e);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.dot.length).toBeGreaterThan(0);
      expect(pill.label).toBe(ESTADO_REGISTRO_LABEL[e]);
    }
  });

  it("ABIERTO usa el verde 'ok'; CERRADO el azul 'info'", () => {
    expect(estadoRegistroPill("ABIERTO").className).toContain("estado-ok");
    expect(estadoRegistroPill("CERRADO").className).toContain("estado-info");
  });
});

describe("ROL_LABEL", () => {
  it("tiene etiqueta no vacía para cada rol (incluye SST)", () => {
    for (const rol of ROLES_USUARIO) {
      expect(ROL_LABEL[rol]?.length ?? 0).toBeGreaterThan(0);
    }
    expect(ROL_LABEL.SST).toContain("Seguridad");
  });
});
