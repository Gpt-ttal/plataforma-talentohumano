import { describe, expect, it } from "vitest";
import { paginar } from "../src/paginacion";

const items = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25

describe("paginar", () => {
  it("devuelve la primera página con el tamaño pedido", () => {
    const r = paginar(items, { pagina: 1, porPagina: 10 });
    expect(r.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.total).toBe(25);
    expect(r.pagina).toBe(1);
    expect(r.porPagina).toBe(10);
    expect(r.totalPaginas).toBe(3);
  });

  it("devuelve la última página parcial", () => {
    const r = paginar(items, { pagina: 3, porPagina: 10 });
    expect(r.items).toEqual([21, 22, 23, 24, 25]);
    expect(r.pagina).toBe(3);
  });

  it("acota una página fuera de rango a la última válida", () => {
    const r = paginar(items, { pagina: 99, porPagina: 10 });
    expect(r.pagina).toBe(3);
    expect(r.items).toEqual([21, 22, 23, 24, 25]);
  });

  it("trata una página <= 0 como la primera", () => {
    const r = paginar(items, { pagina: 0, porPagina: 10 });
    expect(r.pagina).toBe(1);
    expect(r.items[0]).toBe(1);
  });

  it("trata porPagina <= 0 como 1", () => {
    const r = paginar(items, { pagina: 1, porPagina: 0 });
    expect(r.porPagina).toBe(1);
    expect(r.items).toEqual([1]);
    expect(r.totalPaginas).toBe(25);
  });

  it("una lista vacía tiene una página vacía", () => {
    const r = paginar([], { pagina: 1, porPagina: 10 });
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.totalPaginas).toBe(1);
    expect(r.pagina).toBe(1);
  });
});
