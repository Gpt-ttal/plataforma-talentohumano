import { describe, expect, it } from "vitest";
import {
  construirCsvArchivo,
  diasDeTramite,
  parseFiltroArchivo,
} from "../src/archivo.js";
import type { Funcionario } from "../src/domain.js";

/** Funcionario finalizado de ejemplo (estado terminal PAZ_Y_SALVO). */
function fun(over: Partial<Funcionario> = {}): Funcionario {
  return {
    id: "f1",
    documento: "123",
    nombreCompleto: "Ana Pérez",
    fechaRetiro: "2026-01-10",
    areaOrigen: "Biblioteca",
    cargo: "Auxiliar",
    estadoGlobal: "PAZ_Y_SALVO",
    fechaLiquidacionGenerada: "2026-01-15T14:00:00.000Z",
    liquidacionGeneradaPor: "Talento Humano",
    fechaLiquidacion: "2026-01-20T16:30:00.000Z",
    liquidadoPor: "Control Interno",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-20T16:30:00.000Z",
    ...over,
  };
}

describe("diasDeTramite", () => {
  it("cuenta los días completos entre la fecha de retiro y el paz y salvo", () => {
    // retiro 2026-01-10 (00:00 UTC) → paz y salvo 2026-01-20T16:30Z = 10 días completos
    expect(diasDeTramite("2026-01-10", "2026-01-20T16:30:00.000Z")).toBe(10);
  });

  it("devuelve 0 cuando el cierre ocurre el mismo día del retiro", () => {
    expect(diasDeTramite("2026-01-10", "2026-01-10T09:00:00.000Z")).toBe(0);
  });

  it("devuelve null si aún no hay paz y salvo registrado", () => {
    expect(diasDeTramite("2026-01-10", null)).toBeNull();
  });

  it("devuelve null si alguna fecha es inválida", () => {
    expect(diasDeTramite("", "2026-01-20T16:30:00.000Z")).toBeNull();
    expect(diasDeTramite("2026-01-10", "no-es-fecha")).toBeNull();
  });
});

describe("parseFiltroArchivo", () => {
  it("recorta q y descarta vacíos", () => {
    expect(parseFiltroArchivo({ q: "  ana  " })).toMatchObject({ q: "ana" });
    expect(parseFiltroArchivo({ q: "   " }).q).toBeUndefined();
  });

  it("acepta rangos de fecha con formato yyyy-mm-dd y descarta basura", () => {
    const f = parseFiltroArchivo({
      retiroDesde: "2026-01-01",
      retiroHasta: "basura",
    });
    expect(f.retiroDesde).toBe("2026-01-01");
    expect(f.retiroHasta).toBeUndefined();
  });

  it("normaliza la página a un entero >= 1 (default 1)", () => {
    expect(parseFiltroArchivo({}).pagina).toBe(1);
    expect(parseFiltroArchivo({ pagina: "3" }).pagina).toBe(3);
    expect(parseFiltroArchivo({ pagina: "0" }).pagina).toBe(1);
    expect(parseFiltroArchivo({ pagina: "x" }).pagina).toBe(1);
  });
});

describe("construirCsvArchivo", () => {
  it("emite encabezado + una fila por funcionario con días de trámite", () => {
    const csv = construirCsvArchivo([fun()]);
    const lineas = csv.trim().split("\n");
    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toContain("Documento");
    expect(lineas[0]).toContain("Días de trámite");
    // documento, nombre, cargo, área, retiro, y días de trámite (10)
    expect(lineas[1]).toContain("123");
    expect(lineas[1]).toContain("Ana Pérez");
    expect(lineas[1]).toContain("Biblioteca");
    expect(lineas[1]).toContain("10");
  });

  it("escapa comas, comillas y saltos de línea entrecomillando el campo", () => {
    const csv = construirCsvArchivo([
      fun({ nombreCompleto: 'Pérez, Ana "La Jefa"', cargo: "Auxiliar\nSenior" }),
    ]);
    expect(csv).toContain('"Pérez, Ana ""La Jefa"""');
    expect(csv).toContain('"Auxiliar\nSenior"');
  });

  it("deja vacío 'días de trámite' cuando no hay cierre", () => {
    const csv = construirCsvArchivo([
      fun({ fechaLiquidacion: null, liquidadoPor: null }),
    ]);
    const fila = csv.trim().split("\n")[1]!;
    // termina en un campo vacío (sin número de días)
    expect(fila.endsWith(",")).toBe(true);
  });
});
