import { z } from "zod"
import {
  BUCKETS_GESTION,
  ESTADOS_AREA,
  ESTADOS_USUARIO,
  ROLES_USUARIO,
  ESTADOS_GLOBAL,
} from "./domain.js"
import type {
  BucketGestion,
  EstadoArea,
  EstadoGlobal,
  EstadoUsuario,
  RolUsuario,
} from "./domain.js"
import {
  AMBITOS_CAPACITACION,
  ESTADOS_REGISTRO,
  TIPOS_VINCULO,
  normalizarDocumento,
} from "./capacitaciones.js"
import type {
  AmbitoCapacitacion,
  EstadoRegistro,
  TipoVinculo,
} from "./capacitaciones.js"

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

// La matriz funcionario × área reusa la forma del filtro de funcionarios
// (búsqueda + estado global + paginación); las columnas (áreas activas) las
// resuelve el backend, no llegan por el cuerpo.
export const filtroMatrizSchema = filtroFuncionariosSchema
export type FiltroMatrizInput = z.infer<typeof filtroMatrizSchema>

// Cola de un área: areaId obligatorio + paginación + corte por bucket. Sin
// `.strict()` (son query params: pueden venir claves extra que ignoramos).
export const filtroMiAreaSchema = z.object({
  areaId: z.string().uuid(),
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(100).optional(),
  bucket: z
    .enum(BUCKETS_GESTION as unknown as [BucketGestion, ...BucketGestion[]])
    .optional(),
})
export type FiltroMiAreaInput = z.infer<typeof filtroMiAreaSchema>

// ── Catálogo de áreas (solo SUPERADMIN muta; la lectura no requiere body) ─────
// `nombre` recortado, 2–80 chars. IDs validados como UUID en la frontera.
const nombreArea = z.string().trim().min(2).max(80)

export const crearAreaSchema = z.object({ nombre: nombreArea }).strict()
export type CrearAreaInput = z.infer<typeof crearAreaSchema>

export const renombrarAreaSchema = z
  .object({ areaId: z.string().uuid(), nombre: nombreArea })
  .strict()
export type RenombrarAreaInput = z.infer<typeof renombrarAreaSchema>

export const cambiarActivaAreaSchema = z
  .object({ areaId: z.string().uuid(), activa: z.boolean() })
  .strict()
export type CambiarActivaAreaInput = z.infer<typeof cambiarActivaAreaSchema>

export const moverAreaSchema = z
  .object({ areaId: z.string().uuid(), direccion: z.enum(["subir", "bajar"]) })
  .strict()
export type MoverAreaInput = z.infer<typeof moverAreaSchema>

export interface ResultadoMutacion { estadoGlobal: EstadoGlobal; hayRechazo: boolean }

// ── Capacitaciones ────────────────────────────────────────────────────────────
// El gestor crea/edita la metadata del evento; el asistente registra desde el
// formulario PÚBLICO. `.strict()` cierra el contrato HTTP (rechaza claves extra).

export const crearCapacitacionSchema = z
  .object({
    titulo: z.string().trim().min(3).max(200),
    descripcion: z.string().trim().max(2000).optional(),
    // Opcional: TH/SST omiten el ámbito y el backend lo deriva del rol; el SA lo
    // especifica (el caso de uso exige ámbito explícito cuando el rol no lo deriva).
    ambito: z
      .enum(
        AMBITOS_CAPACITACION as unknown as [
          AmbitoCapacitacion,
          ...AmbitoCapacitacion[],
        ],
      )
      .optional(),
    lugar: z.string().trim().max(200).optional(),
    instructor: z.string().trim().max(200).optional(),
    iniciaEn: z.string().datetime({ offset: true }),
    terminaEn: z.string().datetime({ offset: true }),
    horas: z.coerce.number().min(0).max(999).optional(),
  })
  .strict()
  .refine((d) => new Date(d.iniciaEn) < new Date(d.terminaEn), {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["terminaEn"],
  })
export type CrearCapacitacionInput = z.infer<typeof crearCapacitacionSchema>

// Edición: misma forma sin `ambito` (no se reasigna el dueño), todo opcional.
export const editarCapacitacionSchema = z
  .object({
    titulo: z.string().trim().min(3).max(200).optional(),
    descripcion: z.string().trim().max(2000).optional(),
    lugar: z.string().trim().max(200).optional(),
    instructor: z.string().trim().max(200).optional(),
    iniciaEn: z.string().datetime({ offset: true }).optional(),
    terminaEn: z.string().datetime({ offset: true }).optional(),
    horas: z.coerce.number().min(0).max(999).optional(),
  })
  .strict()
  // Cuerpo vacío `{}` es un PATCH no-op: lo rechazamos en la frontera.
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
  // Si ambas fechas vienen en el mismo PATCH, deben formar un rango válido. El
  // borde de editar UN solo extremo lo cierra el caso de uso (fusiona con lo
  // persistido) — aquí no tenemos el valor existente.
  .refine(
    (d) =>
      d.iniciaEn === undefined ||
      d.terminaEn === undefined ||
      new Date(d.iniciaEn) < new Date(d.terminaEn),
    {
      message: "La hora de fin debe ser posterior a la de inicio.",
      path: ["terminaEn"],
    },
  )
export type EditarCapacitacionInput = z.infer<typeof editarCapacitacionSchema>

export const filtroCapacitacionesSchema = z.object({
  q: z.string().optional(),
  ambito: z
    .enum(
      AMBITOS_CAPACITACION as unknown as [
        AmbitoCapacitacion,
        ...AmbitoCapacitacion[],
      ],
    )
    .optional(),
  estado: z
    .enum(ESTADOS_REGISTRO as unknown as [EstadoRegistro, ...EstadoRegistro[]])
    .optional(),
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(100).optional(),
})
export type FiltroCapacitacionesInput = z.infer<typeof filtroCapacitacionesSchema>

// Input PÚBLICO del formulario que abre el QR. Sin login: el asistente digita su
// identidad. `.strict()` evita inyección de campos extra desde un cliente hostil.
export const registrarAsistenciaSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    // Se canoniza tras validar longitud: la clave de conflicto
    // UNIQUE(capacitacion_id, documento) usa la forma normalizada → grafías
    // distintas de la misma cédula colapsan a una sola fila (idempotencia real).
    documento: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .transform((d) => normalizarDocumento(d)),
    correo: z.string().trim().email().max(200).optional(),
    dependencia: z.string().trim().max(200).optional(),
    tipoVinculo: z.enum(
      TIPOS_VINCULO as unknown as [TipoVinculo, ...TipoVinculo[]],
    ),
  })
  .strict()
export type RegistrarAsistenciaInput = z.infer<typeof registrarAsistenciaSchema>
