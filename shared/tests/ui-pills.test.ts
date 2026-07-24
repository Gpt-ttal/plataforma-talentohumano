import { describe, expect, it } from "vitest";
import { ESTADOS_AREA, ESTADOS_GLOBAL, ROLES_USUARIO } from "../src/domain";
import { ESTADOS_REGISTRO } from "../src/capacitaciones";
import { ESTADOS_CAPACITACION_PLANEADA } from "../src/planificador";
import { APROBACION_VACANTE_LABEL, FASE_VACANTE_LABEL, STATUS_VACANTE_LABEL } from "../src/ui";
import { APROBACIONES_PRESUPUESTO_VACANTE, ESTADOS_VACANTE, FASES_VACANTE } from "../src/vacantes";
import type { StatusVacante } from "../src/vacantes";
import {
  ESTADO_AREA_LABEL,
  ESTADO_CAP_PLANEADA_LABEL,
  ESTADO_GLOBAL_LABEL,
  ESTADO_REGISTRO_LABEL,
  ESTADO_VACANTE_LABEL,
  ROL_LABEL,
  aprobacionVacantePill,
  estadoAreaPill,
  estadoCapacitacionPlaneadaPill,
  estadoCapturadoVacantePill,
  estadoGlobalPill,
  estadoRegistroPill,
  estadoVacantePill,
  faseVacantePill,
  indiceFaseVacante,
} from "../src/ui";

const STATUS_VACANTE: readonly StatusVacante[] = ["VIGENTE", "VENCIDA", "CUBIERTA", "CERRADA"];

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

describe("estadoCapacitacionPlaneadaPill", () => {
  it("cubre todos los estados con className, dot y etiqueta", () => {
    for (const e of ESTADOS_CAPACITACION_PLANEADA) {
      const pill = estadoCapacitacionPlaneadaPill(e);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.dot.length).toBeGreaterThan(0);
      expect(pill.label).toBe(ESTADO_CAP_PLANEADA_LABEL[e]);
    }
  });

  it("EN_CURSO usa el verde 'ok'; COMPLETADA el azul 'info'", () => {
    expect(estadoCapacitacionPlaneadaPill("EN_CURSO").className).toContain(
      "estado-ok",
    );
    expect(estadoCapacitacionPlaneadaPill("COMPLETADA").className).toContain(
      "estado-info",
    );
  });
});

describe("estadoVacantePill", () => {
  it("cubre todos los STATUS de vacante con className, dot y etiqueta", () => {
    for (const s of STATUS_VACANTE) {
      const pill = estadoVacantePill(s);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.dot.length).toBeGreaterThan(0);
      expect(pill.label).toBe(STATUS_VACANTE_LABEL[s]);
    }
  });

  it("VIGENTE usa el verde 'ok'; VENCIDA el rojo 'rechazo'", () => {
    expect(estadoVacantePill("VIGENTE").className).toContain("estado-ok");
    expect(estadoVacantePill("VENCIDA").className).toContain("estado-rechazo");
  });
});

describe("estadoCapturadoVacantePill", () => {
  it("cubre todos los estados capturados con className, dot y etiqueta", () => {
    for (const e of ESTADOS_VACANTE) {
      const pill = estadoCapturadoVacantePill(e);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.dot.length).toBeGreaterThan(0);
      expect(pill.label).toBe(ESTADO_VACANTE_LABEL[e]);
    }
  });

  it("CONTRATADO usa el verde 'ok'; CANCELADA el rojo 'rechazo'", () => {
    expect(estadoCapturadoVacantePill("CONTRATADO").className).toContain("estado-ok");
    expect(estadoCapturadoVacantePill("CANCELADA").className).toContain("estado-rechazo");
  });
});

describe("aprobacionVacantePill", () => {
  it("cubre todas las aprobaciones presupuestales con className y etiqueta", () => {
    for (const a of APROBACIONES_PRESUPUESTO_VACANTE) {
      const pill = aprobacionVacantePill(a);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.label).toBe(APROBACION_VACANTE_LABEL[a]);
    }
  });

  it("APROBADO usa el verde 'ok'; NO_APROBADO el rojo 'rechazo'", () => {
    expect(aprobacionVacantePill("APROBADO").className).toContain("estado-ok");
    expect(aprobacionVacantePill("NO_APROBADO").className).toContain("estado-rechazo");
  });
});

describe("faseVacantePill / indiceFaseVacante", () => {
  it("cubre todas las fases con className y etiqueta", () => {
    for (const f of FASES_VACANTE) {
      const pill = faseVacantePill(f);
      expect(pill.className.length).toBeGreaterThan(0);
      expect(pill.label).toBe(FASE_VACANTE_LABEL[f]);
    }
  });

  it("respeta el orden secuencial de las 7 fases (RECLUTAMIENTO primero, CONTRATACION última)", () => {
    expect(indiceFaseVacante("RECLUTAMIENTO")).toBe(0);
    expect(indiceFaseVacante("CONTRATACION")).toBe(FASES_VACANTE.length - 1);
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
