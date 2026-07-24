import { describe, expect, it } from "vitest";
import { MODULOS, modulosParaRol } from "../src/modulos";

describe("MODULOS (registro declarativo)", () => {
  it("cada módulo declara id, rutaBase, al menos un rol y un estado válido", () => {
    for (const m of MODULOS) {
      expect(m.id).toBeTruthy();
      expect(m.rutaBase.startsWith("/")).toBe(true);
      expect(m.rolesQueVen.length).toBeGreaterThan(0);
      expect(["ACTIVO", "PROXIMO"]).toContain(m.estado);
    }
  });

  it("los ids son únicos", () => {
    const ids = MODULOS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sync-personal es PROXIMO mientras no tenga UI enrutada (no ACTIVO)", () => {
    // Guarda contra un revert accidental: el backend existe pero no hay ruta web,
    // así que el tile no debe anunciarse como operativo (rebotaría a /inicio).
    const sync = MODULOS.find((m) => m.id === "sync-personal");
    expect(sync?.estado).toBe("PROXIMO");
  });
});

describe("modulosParaRol", () => {
  it("SUPERADMIN ve todos los módulos", () => {
    const ids = modulosParaRol("SUPERADMIN").map((m) => m.id);
    expect(ids).toEqual(MODULOS.map((m) => m.id));
  });

  it("TALENTO_HUMANO ve paz-y-salvo, capacitaciones y reportes (no organigrama)", () => {
    const ids = modulosParaRol("TALENTO_HUMANO").map((m) => m.id);
    expect(ids).toContain("paz-y-salvo");
    expect(ids).toContain("capacitaciones");
    expect(ids).toContain("reportes");
    expect(ids).not.toContain("organigrama");
  });

  it("SST solo ve capacitaciones", () => {
    expect(modulosParaRol("SST").map((m) => m.id)).toEqual(["capacitaciones"]);
  });

  it("CONTROL_INTERNO solo ve paz-y-salvo", () => {
    expect(modulosParaRol("CONTROL_INTERNO").map((m) => m.id)).toEqual([
      "paz-y-salvo",
    ]);
  });

  it("AREA solo ve paz-y-salvo", () => {
    expect(modulosParaRol("AREA").map((m) => m.id)).toEqual(["paz-y-salvo"]);
  });

  it("preserva el orden declarado en MODULOS", () => {
    const sa = modulosParaRol("SUPERADMIN");
    expect(sa[0].id).toBe("paz-y-salvo");
    expect(sa[1].id).toBe("capacitaciones");
  });
});
