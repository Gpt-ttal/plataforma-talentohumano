import { z } from "zod"
import { ESTADOS_AREA, ESTADOS_USUARIO, ROLES_USUARIO, ESTADOS_GLOBAL } from "./domain.js"
import type { EstadoArea, EstadoGlobal, EstadoUsuario, RolUsuario } from "./domain.js"

// Los `as unknown as [T, ...T[]]` preservan el tipo literal del enum (p. ej.
// `EstadoArea`), no `string`, para que `z.infer` produzca las uniones del dominio
// y los casos de uso del backend reciban tipos exactos sin casts.
// IDs validados como UUID: todos referencian columnas `uuid` (funcionarios,
// areas, auth.users) → un ID malformado se rechaza con 400 en la frontera en
// vez de propagar un error de Postgres (500). `.strict()` rechaza claves extra
// en el cuerpo: defensa en profundidad sobre el contrato HTTP.
export const cambiarEstadoAreaSchema = z
  .object({
    funcionarioId: z.string().uuid(),
    areaId: z.string().uuid(),
    estado: z.enum(ESTADOS_AREA as unknown as [EstadoArea, ...EstadoArea[]]),
    observacion: z.string().trim().min(1).optional(),
  })
  .strict()
export type CambiarEstadoAreaInput = z.infer<typeof cambiarEstadoAreaSchema>

export const asignarRolSchema = z
  .object({
    usuarioId: z.string().uuid(),
    rol: z.enum(ROLES_USUARIO as unknown as [RolUsuario, ...RolUsuario[]]),
    areaId: z.string().uuid().nullable().optional(),
  })
  .strict()
export type AsignarRolInput = z.infer<typeof asignarRolSchema>

export const cambiarEstadoUsuarioSchema = z
  .object({
    usuarioId: z.string().uuid(),
    estado: z.enum(ESTADOS_USUARIO as unknown as [EstadoUsuario, ...EstadoUsuario[]]),
  })
  .strict()
export type CambiarEstadoUsuarioInput = z.infer<typeof cambiarEstadoUsuarioSchema>

export const filtroFuncionariosSchema = z.object({
  q: z.string().optional(),
  estado: z
    .enum(ESTADOS_GLOBAL as unknown as [EstadoGlobal, ...EstadoGlobal[]])
    .optional(),
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(100).optional(),
})
export type FiltroFuncionariosInput = z.infer<typeof filtroFuncionariosSchema>

export interface ResultadoMutacion { estadoGlobal: EstadoGlobal; hayRechazo: boolean }
