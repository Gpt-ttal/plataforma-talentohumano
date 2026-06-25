import type { EstadoGlobal, Funcionario, RolUsuario, Usuario } from "@pys/shared"

/** Construye un Usuario de prueba con valores por defecto sensatos. */
export function hacerUsuario(parche: Partial<Usuario> = {}): Usuario {
  return {
    id: "u1",
    email: "usuario@americana.edu.co",
    nombre: "Usuario Prueba",
    rol: "SUPERADMIN",
    areaId: null,
    estado: "ACTIVO",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...parche,
  }
}

/** Construye un Funcionario de prueba con el estado global indicado. */
export function hacerFuncionario(
  estadoGlobal: EstadoGlobal,
  parche: Partial<Funcionario> = {},
): Funcionario {
  return {
    id: "f1",
    documento: "1000",
    nombreCompleto: "Funcionario Prueba",
    fechaRetiro: "2026-02-01",
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
  }
}

export const rol = (r: RolUsuario): Partial<Usuario> => ({ rol: r })
