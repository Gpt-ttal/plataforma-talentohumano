import { describe, expect, it } from "vitest";
import {
  esEstadoGlobal,
  hrefCon,
  parseFiltroFuncionarios,
} from "../src/catalogo";

describe("hrefCon", () => {
  it("devuelve solo la ruta base cuando no hay params útiles", () => {
    expect(hrefCon("/funcionarios", {})).toBe("/funcionarios");
    expect(
      hrefCon("/funcionarios", { q: undefined, estado: null, pagina: "" }),
    ).toBe("/funcionarios");
  });

  it("omite vacíos y recorta, conservando los útiles", () => {
    expect(
      hrefCon("/funcionarios", { vista: "th", q: "  ", pagina: 2 }),
    ).toBe("/funcionarios?vista=th&pagina=2");
  });

  it("acepta números y strings", () => {
    expect(hrefCon("/mi-area", { area: 7, pagina: 3 })).toBe(
      "/mi-area?area=7&pagina=3",
    );
  });
});

describe("esEstadoGlobal", () => {
  it("reconoce los estados globales válidos", () => {
    expect(esEstadoGlobal("PAZ_Y_SALVO")).toBe(true);
    expect(esEstadoGlobal("LISTO_PARA_LIQUIDAR")).toBe(true);
  });

  it("rechaza basura, vacío y null", () => {
    expect(esEstadoGlobal("TH")).toBe(false);
    expect(esEstadoGlobal("")).toBe(false);
    expect(esEstadoGlobal(undefined)).toBe(false);
    expect(esEstadoGlobal(null)).toBe(false);
  });
});

describe("parseFiltroFuncionarios", () => {
  it("toma q (recortado), estado válido y página", () => {
    expect(
      parseFiltroFuncionarios({ q: "  roger ", estado: "PENDIENTE", pagina: "2" }),
    ).toEqual({ q: "roger", estado: "PENDIENTE", pagina: 2 });
  });

  it("descarta estado inválido y q vacío", () => {
    expect(parseFiltroFuncionarios({ q: "   ", estado: "xx" })).toEqual({
      q: undefined,
      estado: undefined,
      pagina: 1,
    });
  });

  it("normaliza la página a un entero >= 1 (default 1)", () => {
    expect(parseFiltroFuncionarios({}).pagina).toBe(1);
    expect(parseFiltroFuncionarios({ pagina: "0" }).pagina).toBe(1);
    expect(parseFiltroFuncionarios({ pagina: "-4" }).pagina).toBe(1);
    expect(parseFiltroFuncionarios({ pagina: "abc" }).pagina).toBe(1);
    expect(parseFiltroFuncionarios({ pagina: "5" }).pagina).toBe(5);
  });
});
