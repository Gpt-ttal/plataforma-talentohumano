import { describe, it, expect } from "vitest";
import {
  agregarPorEstado,
  calcularAging,
  agruparPorCampo,
  filtrarPorRangoRetiro,
} from "../src/metricas";
import type { EstadoGlobal, Funcionario } from "../src/domain";

/** Funcionario de prueba con valores por defecto sensatos. */
const mkF = (
  estadoGlobal: EstadoGlobal,
  parche: Partial<Funcionario> = {},
): Funcionario => ({
  id: "f",
  documento: "1",
  nombreCompleto: "X",
  fechaRetiro: "2026-02-20",
  areaOrigen: "Docencia",
  cargo: "Docente",
  estadoGlobal,
  fechaLiquidacionGenerada: null,
  liquidacionGeneradaPor: null,
  fechaLiquidacion: null,
  liquidadoPor: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...parche,
});

describe("agregarPorEstado", () => {
  it("inicializa todas las claves en 0 con lista vacía", () => {
    expect(agregarPorEstado([])).toEqual({
      PENDIENTE: 0,
      LISTO_PARA_LIQUIDAR: 0,
      LIQUIDACION_GENERADA: 0,
      PAZ_Y_SALVO: 0,
    });
  });

  it("cuenta por estado global", () => {
    const r = agregarPorEstado([
      mkF("PENDIENTE"),
      mkF("PENDIENTE"),
      mkF("PAZ_Y_SALVO"),
    ]);
    expect(r.PENDIENTE).toBe(2);
    expect(r.PAZ_Y_SALVO).toBe(1);
    expect(r.LISTO_PARA_LIQUIDAR).toBe(0);
  });
});

describe("calcularAging", () => {
  const hoy = new Date("2026-02-15T12:00:00.000Z"); // inicioHoy = 2026-02-15 UTC

  it("excluye trámites ya resueltos (liquidación generada / paz y salvo)", () => {
    const r = calcularAging(
      [
        mkF("LIQUIDACION_GENERADA", { fechaRetiro: "2026-01-01" }),
        mkF("PAZ_Y_SALVO", { fechaRetiro: "2026-01-01" }),
      ],
      hoy,
    );
    expect(r).toEqual({ atrasados: 0, proximos: 0, masAdelante: 0, sinFecha: 0 });
  });

  it("clasifica por fecha contra el inicio del día (UTC)", () => {
    const r = calcularAging(
      [
        mkF("PENDIENTE", { fechaRetiro: "2026-02-10" }), // < hoy → atrasado
        mkF("PENDIENTE", { fechaRetiro: "2026-02-15" }), // == hoy → próximo
        mkF("PENDIENTE", { fechaRetiro: "2026-02-22" }), // hoy+7 (límite) → próximo
        mkF("PENDIENTE", { fechaRetiro: "2026-02-23" }), // hoy+8 → más adelante
        mkF("PENDIENTE", { fechaRetiro: null }), // sin fecha
      ],
      hoy,
    );
    expect(r).toEqual({ atrasados: 1, proximos: 2, masAdelante: 1, sinFecha: 1 });
  });

  it("cuenta como sinFecha una fecha no parseable", () => {
    const r = calcularAging([mkF("PENDIENTE", { fechaRetiro: "no-es-fecha" })], hoy);
    expect(r.sinFecha).toBe(1);
  });
});

describe("agruparPorCampo", () => {
  it("agrupa y ordena de mayor a menor (desempate alfabético)", () => {
    const r = agruparPorCampo(
      [
        mkF("PENDIENTE", { cargo: "Docente" }),
        mkF("PENDIENTE", { cargo: "Docente" }),
        mkF("PENDIENTE", { cargo: "Auxiliar" }),
        mkF("PENDIENTE", { cargo: "Bibliotecario" }),
      ],
      "cargo",
    );
    expect(r).toEqual([
      { clave: "Docente", valor: 2 },
      { clave: "Auxiliar", valor: 1 },
      { clave: "Bibliotecario", valor: 1 },
    ]);
  });

  it("las claves vacías caen en 'Sin dato'", () => {
    const r = agruparPorCampo(
      [mkF("PENDIENTE", { areaOrigen: "   " }), mkF("PENDIENTE", { areaOrigen: "" })],
      "areaOrigen",
    );
    expect(r).toEqual([{ clave: "Sin dato", valor: 2 }]);
  });
});

describe("filtrarPorRangoRetiro", () => {
  const lista = [
    mkF("PENDIENTE", { id: "a", fechaRetiro: "2026-01-10" }),
    mkF("PENDIENTE", { id: "b", fechaRetiro: "2026-02-20" }),
    mkF("PENDIENTE", { id: "c", fechaRetiro: "2026-03-05" }),
    mkF("PENDIENTE", { id: "d", fechaRetiro: null }),
  ];

  it("sin límites devuelve una copia con todos", () => {
    const r = filtrarPorRangoRetiro(lista);
    expect(r).toHaveLength(4);
    expect(r).not.toBe(lista);
  });

  it("aplica límites inclusivos y excluye a quien no tiene fecha", () => {
    const r = filtrarPorRangoRetiro(lista, "2026-02-01", "2026-03-05");
    expect(r.map((f) => f.id)).toEqual(["b", "c"]);
  });

  it("acepta sólo límite inferior o superior", () => {
    expect(filtrarPorRangoRetiro(lista, "2026-02-21").map((f) => f.id)).toEqual(["c"]);
    expect(filtrarPorRangoRetiro(lista, undefined, "2026-01-31").map((f) => f.id)).toEqual([
      "a",
    ]);
  });
});
