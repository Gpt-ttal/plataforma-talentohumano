import { describe, expect, it } from "vitest";
import { errorInvarianteUsuario, esEmailValido } from "../src/usuarios";

describe("esEmailValido", () => {
  it("acepta correos bien formados (normaliza caja/espacios)", () => {
    expect(esEmailValido("leo@americana.edu.co")).toBe(true);
    expect(esEmailValido("  LEO@Americana.Edu.CO  ")).toBe(true);
  });

  it("rechaza cadenas que no son correos", () => {
    for (const mal of ["", "no-es-correo", "sin-dominio@", "@sin-local.co", "a b@x.co", "a@b"]) {
      expect(esEmailValido(mal)).toBe(false);
    }
  });
});

describe("errorInvarianteUsuario", () => {
  it("acepta un usuario de área ACTIVO con área asignada", () => {
    expect(
      errorInvarianteUsuario({ rol: "AREA", estado: "ACTIVO", areaId: "a1" }),
    ).toBeNull();
  });

  it("rechaza un usuario de área ACTIVO sin área", () => {
    expect(
      errorInvarianteUsuario({ rol: "AREA", estado: "ACTIVO", areaId: null }),
    ).not.toBeNull();
  });

  it("acepta un usuario de área PENDIENTE sin área (aún sin asignar)", () => {
    expect(
      errorInvarianteUsuario({ rol: "AREA", estado: "PENDIENTE", areaId: null }),
    ).toBeNull();
  });

  it("rechaza un rol no-área con área asignada", () => {
    expect(
      errorInvarianteUsuario({
        rol: "TALENTO_HUMANO",
        estado: "ACTIVO",
        areaId: "a1",
      }),
    ).not.toBeNull();
    expect(
      errorInvarianteUsuario({
        rol: "SUPERADMIN",
        estado: "ACTIVO",
        areaId: "a1",
      }),
    ).not.toBeNull();
  });

  it("acepta un rol no-área sin área", () => {
    expect(
      errorInvarianteUsuario({
        rol: "CONTROL_INTERNO",
        estado: "ACTIVO",
        areaId: null,
      }),
    ).toBeNull();
  });
});
