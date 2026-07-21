import { describe, it, expect, vi } from "vitest"
import type { Usuario } from "@pys/shared"
import { cambiarEstadoArea } from "../src/application/funcionarios/cambiarEstadoArea"
import { devolverCasoAArea } from "../src/application/funcionarios/devolverCasoAArea"
import {
  ErrorAutorizacion,
  ErrorNoEncontrado,
  ErrorValidacion,
} from "../src/application/errors"

/** Detalle mínimo que devuelve `obtenerDetalle`; solo se lee `estadoGlobal`. */
const detalleEn = (estadoGlobal: string) =>
  ({ funcionario: { estadoGlobal }, aprobaciones: [], observaciones: [] }) as any

const usuarioArea = (areaId: string | null): Usuario => ({
  id: "u1",
  email: "area@americana.edu.co",
  nombre: "Coordinador Área",
  rol: "AREA",
  areaId,
  estado: "ACTIVO",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
})

const superadmin: Usuario = {
  id: "sa",
  email: "leonardoreales@americana.edu.co",
  nombre: "Super Admin",
  rol: "SUPERADMIN",
  areaId: null,
  estado: "ACTIVO",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("cambiarEstadoArea (guarda de área + validación)", () => {
  it("rechaza si el usuario AREA no es dueño del área", async () => {
    const repo = { cambiarEstadoArea: vi.fn() } as any
    const uc = cambiarEstadoArea({ repo })
    await expect(
      uc(usuarioArea("a1"), { funcionarioId: "f1", areaId: "OTRA", estado: "APROBADO" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.cambiarEstadoArea).not.toHaveBeenCalled()
  })

  it("rechaza a TALENTO_HUMANO (no gestiona áreas)", async () => {
    const repo = { cambiarEstadoArea: vi.fn() } as any
    const th = { ...superadmin, rol: "TALENTO_HUMANO" as const, id: "th" }
    const uc = cambiarEstadoArea({ repo })
    await expect(
      uc(th, { funcionarioId: "f1", areaId: "a1", estado: "APROBADO" }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.cambiarEstadoArea).not.toHaveBeenCalled()
  })

  it("exige observación al RECHAZAR (NO_APROBADO)", async () => {
    const repo = { cambiarEstadoArea: vi.fn() } as any
    const uc = cambiarEstadoArea({ repo })
    await expect(
      uc(usuarioArea("a1"), { funcionarioId: "f1", areaId: "a1", estado: "NO_APROBADO" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.cambiarEstadoArea).not.toHaveBeenCalled()
  })

  it("exige observación al DEVOLVER a PENDIENTE", async () => {
    const repo = { cambiarEstadoArea: vi.fn() } as any
    const uc = cambiarEstadoArea({ repo })
    await expect(
      uc(usuarioArea("a1"), { funcionarioId: "f1", areaId: "a1", estado: "PENDIENTE" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
  })

  it("rechaza si el funcionario no existe (404)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(null),
      cambiarEstadoArea: vi.fn(),
    } as any
    const uc = cambiarEstadoArea({ repo })
    await expect(
      uc(usuarioArea("a1"), { funcionarioId: "noexiste", areaId: "a1", estado: "APROBADO" }),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.cambiarEstadoArea).not.toHaveBeenCalled()
  })

  it("rechaza si el trámite ya está cerrado (PAZ_Y_SALVO)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleEn("PAZ_Y_SALVO")),
      cambiarEstadoArea: vi.fn(),
    } as any
    const uc = cambiarEstadoArea({ repo })
    await expect(
      uc(usuarioArea("a1"), { funcionarioId: "f1", areaId: "a1", estado: "APROBADO" }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.cambiarEstadoArea).not.toHaveBeenCalled()
  })

  it("aprueba si es dueño del área y pasa el autor (nombre)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleEn("PENDIENTE")),
      cambiarEstadoArea: vi
        .fn()
        .mockResolvedValue({ estadoGlobal: "PENDIENTE", hayRechazo: false }),
    } as any
    const uc = cambiarEstadoArea({ repo })
    const r = await uc(usuarioArea("a1"), {
      funcionarioId: "f1",
      areaId: "a1",
      estado: "APROBADO",
    })
    expect(r.estadoGlobal).toBe("PENDIENTE")
    expect(repo.cambiarEstadoArea).toHaveBeenCalledWith({
      funcionarioId: "f1",
      areaId: "a1",
      estado: "APROBADO",
      observacion: undefined,
      autor: "Coordinador Área",
    })
  })

  it("SUPERADMIN puede gestionar cualquier área", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleEn("PENDIENTE")),
      cambiarEstadoArea: vi
        .fn()
        .mockResolvedValue({ estadoGlobal: "LISTO_PARA_LIQUIDAR", hayRechazo: false }),
    } as any
    const uc = cambiarEstadoArea({ repo })
    const r = await uc(superadmin, { funcionarioId: "f1", areaId: "cualquiera", estado: "NO_APLICA" })
    expect(r.estadoGlobal).toBe("LISTO_PARA_LIQUIDAR")
  })
})

describe("devolverCasoAArea (Control Interno devuelve a un área puntual)", () => {
  const controlInterno: Usuario = {
    id: "ci",
    email: "ci@americana.edu.co",
    nombre: "Control Interno",
    rol: "CONTROL_INTERNO",
    areaId: null,
    estado: "ACTIVO",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }

  it("rechaza a AREA (no puede devolver casos)", async () => {
    const repo = { devolverCasoAArea: vi.fn() } as any
    const uc = devolverCasoAArea({ repo })
    await expect(
      uc(usuarioArea("a1"), "f1", { areaId: "a1", observacion: "Falta soporte." }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.devolverCasoAArea).not.toHaveBeenCalled()
  })

  it("rechaza a TALENTO_HUMANO (no valida áreas)", async () => {
    const repo = { devolverCasoAArea: vi.fn() } as any
    const th = { ...superadmin, rol: "TALENTO_HUMANO" as const, id: "th" }
    const uc = devolverCasoAArea({ repo })
    await expect(
      uc(th, "f1", { areaId: "a1", observacion: "Falta soporte." }),
    ).rejects.toBeInstanceOf(ErrorAutorizacion)
    expect(repo.devolverCasoAArea).not.toHaveBeenCalled()
  })

  it("exige observación (400 si viene vacía)", async () => {
    const repo = { devolverCasoAArea: vi.fn() } as any
    const uc = devolverCasoAArea({ repo })
    await expect(
      uc(controlInterno, "f1", { areaId: "a1", observacion: "   " }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.devolverCasoAArea).not.toHaveBeenCalled()
  })

  it("rechaza si el funcionario no existe (404)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(null),
      devolverCasoAArea: vi.fn(),
    } as any
    const uc = devolverCasoAArea({ repo })
    await expect(
      uc(controlInterno, "noexiste", { areaId: "a1", observacion: "Falta soporte." }),
    ).rejects.toBeInstanceOf(ErrorNoEncontrado)
    expect(repo.devolverCasoAArea).not.toHaveBeenCalled()
  })

  it("rechaza si el trámite ya está cerrado (PAZ_Y_SALVO)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleEn("PAZ_Y_SALVO")),
      devolverCasoAArea: vi.fn(),
    } as any
    const uc = devolverCasoAArea({ repo })
    await expect(
      uc(controlInterno, "f1", { areaId: "a1", observacion: "Falta soporte." }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
    expect(repo.devolverCasoAArea).not.toHaveBeenCalled()
  })

  it("Control Interno devuelve el caso y pasa el autor (nombre)", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleEn("LISTO_PARA_LIQUIDAR")),
      devolverCasoAArea: vi
        .fn()
        .mockResolvedValue({ estadoGlobal: "PENDIENTE", hayRechazo: false, hayDevolucion: true }),
    } as any
    const uc = devolverCasoAArea({ repo })
    const r = await uc(controlInterno, "f1", {
      areaId: "a1",
      observacion: "Encontré una inconsistencia en el soporte.",
    })
    expect(r.hayDevolucion).toBe(true)
    expect(repo.devolverCasoAArea).toHaveBeenCalledWith({
      funcionarioId: "f1",
      areaId: "a1",
      observacion: "Encontré una inconsistencia en el soporte.",
      autor: "Control Interno",
    })
  })

  it("SUPERADMIN también puede devolver el caso", async () => {
    const repo = {
      obtenerDetalle: vi.fn().mockResolvedValue(detalleEn("PENDIENTE")),
      devolverCasoAArea: vi
        .fn()
        .mockResolvedValue({ estadoGlobal: "PENDIENTE", hayRechazo: false, hayDevolucion: true }),
    } as any
    const uc = devolverCasoAArea({ repo })
    const r = await uc(superadmin, "f1", { areaId: "a1", observacion: "Motivo." })
    expect(r.hayDevolucion).toBe(true)
  })
})
