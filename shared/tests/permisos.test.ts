import { describe, expect, it } from "vitest";
import type { Usuario } from "../src/domain";
import {
  areaPermitida,
  rolPuedeVerVista,
  rolVePlataforma,
  rutaInicialPorRol,
  rutaOficinaPorRol,
} from "../src/permisos";

/** Helper para construir un usuario de prueba sin repetir campos. */
function usuario(parche: Partial<Usuario> = {}): Usuario {
  return {
    id: "u1",
    email: "persona@americana.edu.co",
    nombre: "Persona Prueba",
    rol: "AREA",
    areaId: "a1",
    estado: "ACTIVO",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...parche,
  };
}

describe("rutaInicialPorRol", () => {
  it("manda a /pendiente a cualquier rol que no esté ACTIVO", () => {
    expect(rutaInicialPorRol("SUPERADMIN", "PENDIENTE")).toBe("/pendiente");
    expect(rutaInicialPorRol("AREA", "PENDIENTE")).toBe("/pendiente");
    expect(rutaInicialPorRol("TALENTO_HUMANO", "INACTIVO")).toBe("/pendiente");
  });

  it("lleva a SUPERADMIN y TH al home de la plataforma", () => {
    expect(rutaInicialPorRol("SUPERADMIN", "ACTIVO")).toBe("/inicio");
    expect(rutaInicialPorRol("TALENTO_HUMANO", "ACTIVO")).toBe("/inicio");
  });

  it("lleva a Control Interno directo a su oficina (cierre del trámite)", () => {
    expect(rutaInicialPorRol("CONTROL_INTERNO", "ACTIVO")).toBe(
      "/paz-y-salvo/control-interno",
    );
  });

  it("lleva a un usuario de área directo a su cola en el módulo", () => {
    expect(rutaInicialPorRol("AREA", "ACTIVO")).toBe("/paz-y-salvo/mi-area");
  });

  it("lleva a SST directo a su módulo de Capacitaciones (rol acotado)", () => {
    expect(rutaInicialPorRol("SST", "ACTIVO")).toBe("/capacitaciones");
    expect(rutaInicialPorRol("SST", "PENDIENTE")).toBe("/pendiente");
  });
});

describe("rutaOficinaPorRol", () => {
  it("SUPERADMIN entra al catálogo de supervisión", () => {
    expect(rutaOficinaPorRol("SUPERADMIN")).toBe("/paz-y-salvo/funcionarios");
  });

  it("TALENTO_HUMANO entra a su oficina dedicada", () => {
    expect(rutaOficinaPorRol("TALENTO_HUMANO")).toBe("/paz-y-salvo/talento-humano");
  });

  it("CONTROL_INTERNO entra a su oficina dedicada", () => {
    expect(rutaOficinaPorRol("CONTROL_INTERNO")).toBe("/paz-y-salvo/control-interno");
  });

  it("AREA entra a su cola de trabajo", () => {
    expect(rutaOficinaPorRol("AREA")).toBe("/paz-y-salvo/mi-area");
  });

  it("SST no tiene oficina en Paz y Salvo; va a Capacitaciones", () => {
    expect(rutaOficinaPorRol("SST")).toBe("/capacitaciones");
  });
});

describe("areaPermitida", () => {
  it("el superadmin puede ver cualquier área", () => {
    expect(areaPermitida(usuario({ rol: "SUPERADMIN", areaId: null }), "a9")).toBe(
      true,
    );
  });

  it("un usuario de área solo puede ver la suya", () => {
    const u = usuario({ rol: "AREA", areaId: "a1" });
    expect(areaPermitida(u, "a1")).toBe(true);
    expect(areaPermitida(u, "a2")).toBe(false);
  });

  it("un usuario de área sin área asignada no puede ver ninguna", () => {
    expect(areaPermitida(usuario({ rol: "AREA", areaId: null }), "a1")).toBe(false);
  });

  it("TH y CI no gestionan áreas", () => {
    expect(areaPermitida(usuario({ rol: "TALENTO_HUMANO", areaId: null }), "a1")).toBe(
      false,
    );
    expect(areaPermitida(usuario({ rol: "CONTROL_INTERNO", areaId: null }), "a1")).toBe(
      false,
    );
  });
});

describe("rolPuedeVerVista", () => {
  it("el superadmin ve todas las vistas de supervisión", () => {
    expect(rolPuedeVerVista("SUPERADMIN", "todos")).toBe(true);
    expect(rolPuedeVerVista("SUPERADMIN", "th")).toBe(true);
    expect(rolPuedeVerVista("SUPERADMIN", "ci")).toBe(true);
  });

  it("Talento Humano solo ve su vista", () => {
    expect(rolPuedeVerVista("TALENTO_HUMANO", "th")).toBe(true);
    expect(rolPuedeVerVista("TALENTO_HUMANO", "ci")).toBe(false);
    expect(rolPuedeVerVista("TALENTO_HUMANO", "todos")).toBe(false);
  });

  it("Control Interno solo ve su vista", () => {
    expect(rolPuedeVerVista("CONTROL_INTERNO", "ci")).toBe(true);
    expect(rolPuedeVerVista("CONTROL_INTERNO", "th")).toBe(false);
  });

  it("un usuario de área no ve vistas de supervisión", () => {
    expect(rolPuedeVerVista("AREA", "todos")).toBe(false);
    expect(rolPuedeVerVista("AREA", "th")).toBe(false);
    expect(rolPuedeVerVista("AREA", "ci")).toBe(false);
  });
});

describe("rolVePlataforma", () => {
  it("SUPERADMIN ve la plataforma", () => {
    expect(rolVePlataforma("SUPERADMIN")).toBe(true);
  });

  it("TALENTO_HUMANO ve la plataforma", () => {
    expect(rolVePlataforma("TALENTO_HUMANO")).toBe(true);
  });

  it("CONTROL_INTERNO no ve la plataforma", () => {
    expect(rolVePlataforma("CONTROL_INTERNO")).toBe(false);
  });

  it("AREA no ve la plataforma", () => {
    expect(rolVePlataforma("AREA")).toBe(false);
  });

  it("SST no ve la plataforma (rol acotado a Capacitaciones)", () => {
    expect(rolVePlataforma("SST")).toBe(false);
  });
});
