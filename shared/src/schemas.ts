import { z } from "zod"
import {
  BUCKETS_GESTION,
  ESTADOS_AREA,
  ESTADOS_USUARIO,
  ROLES_USUARIO,
  ESTADOS_GLOBAL,
  ESTADOS_VINCULACION,
  TIPOS_VINCULACION,
  TIPOS_CONTRATO,
  MODALIDADES,
  GENEROS,
  PARENTESCOS,
  NIVELES_FORMACION,
} from "./domain.js"
import type {
  BucketGestion,
  EstadoArea,
  EstadoGlobal,
  EstadoUsuario,
  EstadoVinculacion,
  RolUsuario,
  TipoVinculacion,
  TipoContrato,
  Modalidad,
  Genero,
  Parentesco,
  NivelFormacion,
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
import { TIPOS_CONTENIDO_LECCION } from "./cursos.js"
import type { TipoContenidoLeccion } from "./cursos.js"
import { ESTADOS_CAPACITACION_PLANEADA } from "./planificador.js"
import type { EstadoCapacitacionPlaneada } from "./planificador.js"

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

/**
 * Devolver un caso a un área puntual (Control Interno). A diferencia de
 * `cambiarEstadoAreaSchema`, aquí la observación siempre es obligatoria — no
 * existe una devolución "sin motivo".
 */
export const devolverCasoAAreaSchema = z
  .object({
    funcionarioId: z.string().uuid(),
    areaId: z.string().uuid(),
    observacion: z.string().trim().min(1),
  })
  .strict()
export type DevolverCasoAAreaSchemaInput = z.infer<
  typeof devolverCasoAAreaSchema
>

/** Confirmar (parcial o total) las filas VALIDA seleccionadas de un lote de importación. */
export const confirmarImportacionParcialSchema = z
  .object({
    filaIds: z.array(z.string().uuid()).min(1),
  })
  .strict()
export type ConfirmarImportacionParcialInput = z.infer<
  typeof confirmarImportacionParcialSchema
>

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
  areaBloqueante: z.string().uuid().optional(),
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

// ── Cursos ────────────────────────────────────────────────────────────────────
// El gestor crea/edita el curso y su estructura (módulos/lecciones); el
// funcionario ingresa desde el link público (sin login, identificado por
// cédula) y marca lecciones completadas. `.strict()` cierra el contrato HTTP.

export const crearCursoSchema = z
  .object({
    titulo: z.string().trim().min(3).max(200),
    descripcion: z.string().trim().max(2000).optional(),
    // Opcional: TH/SST omiten el ámbito y el backend lo deriva del rol; el SA lo
    // especifica (mismo patrón que crearCapacitacionSchema).
    ambito: z
      .enum(
        AMBITOS_CAPACITACION as unknown as [
          AmbitoCapacitacion,
          ...AmbitoCapacitacion[],
        ],
      )
      .optional(),
  })
  .strict()
export type CrearCursoInput = z.infer<typeof crearCursoSchema>

export const editarCursoSchema = z
  .object({
    titulo: z.string().trim().min(3).max(200).optional(),
    descripcion: z.string().trim().max(2000).optional(),
    ambito: z
      .enum(
        AMBITOS_CAPACITACION as unknown as [
          AmbitoCapacitacion,
          ...AmbitoCapacitacion[],
        ],
      )
      .optional(),
  })
  .strict()
  // Cuerpo vacío `{}` es un PATCH no-op: lo rechazamos en la frontera.
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
export type EditarCursoInput = z.infer<typeof editarCursoSchema>

export const filtroCursosSchema = z.object({
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
export type FiltroCursosInput = z.infer<typeof filtroCursosSchema>

// El cursoId/moduloId/leccionId viajan por el parámetro de ruta, no por el
// cuerpo (mismo patrón que las rutas anidadas del resto del backend).
export const crearCursoModuloSchema = z
  .object({ titulo: z.string().trim().min(2).max(200) })
  .strict()
export type CrearCursoModuloInput = z.infer<typeof crearCursoModuloSchema>

export const editarCursoModuloSchema = z
  .object({ titulo: z.string().trim().min(2).max(200) })
  .strict()
export type EditarCursoModuloInput = z.infer<typeof editarCursoModuloSchema>

// Reordenar un módulo o una lección: mismo shape que `moverAreaSchema` sin el
// id (que va en el parámetro de ruta).
export const moverCursoModuloSchema = z
  .object({ direccion: z.enum(["subir", "bajar"]) })
  .strict()
export type MoverCursoModuloInput = z.infer<typeof moverCursoModuloSchema>

export const moverLeccionSchema = z
  .object({ direccion: z.enum(["subir", "bajar"]) })
  .strict()
export type MoverLeccionInput = z.infer<typeof moverLeccionSchema>

export const crearLeccionSchema = z
  .object({
    titulo: z.string().trim().min(2).max(200),
    tipoContenido: z.enum(
      TIPOS_CONTENIDO_LECCION as unknown as [
        TipoContenidoLeccion,
        ...TipoContenidoLeccion[],
      ],
    ),
    contenidoTexto: z.string().max(50000).optional(),
    urlVideo: z.string().trim().url().max(500).optional(),
  })
  .strict()
  .refine((d) => d.tipoContenido !== "VIDEO" || d.urlVideo !== undefined, {
    message: "Una lección de video debe incluir la URL del video.",
    path: ["urlVideo"],
  })
  .refine(
    (d) => d.tipoContenido !== "TEXTO" || d.contenidoTexto !== undefined,
    {
      message: "Una lección de texto debe incluir el contenido.",
      path: ["contenidoTexto"],
    },
  )
export type CrearLeccionInput = z.infer<typeof crearLeccionSchema>

// Edición: mismo shape opcional. El refine cruzado solo aplica si
// `tipoContenido` viene en el patch — si se omite, no forzamos el campo de
// contenido correspondiente; el caso de uso mergea con la fila persistida
// (Fase 2), igual que el borde de fechas de `editarCapacitacionSchema`.
export const editarLeccionSchema = z
  .object({
    titulo: z.string().trim().min(2).max(200).optional(),
    tipoContenido: z
      .enum(
        TIPOS_CONTENIDO_LECCION as unknown as [
          TipoContenidoLeccion,
          ...TipoContenidoLeccion[],
        ],
      )
      .optional(),
    contenidoTexto: z.string().max(50000).optional(),
    urlVideo: z.string().trim().url().max(500).optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
  .refine((d) => d.tipoContenido !== "VIDEO" || d.urlVideo !== undefined, {
    message: "Una lección de video debe incluir la URL del video.",
    path: ["urlVideo"],
  })
  .refine(
    (d) => d.tipoContenido !== "TEXTO" || d.contenidoTexto !== undefined,
    {
      message: "Una lección de texto debe incluir el contenido.",
      path: ["contenidoTexto"],
    },
  )
export type EditarLeccionInput = z.infer<typeof editarLeccionSchema>

// Input PÚBLICO del formulario que abre el link del curso. Sin login: el
// funcionario digita su identidad. Idéntico shape a `registrarAsistenciaSchema`
// menos `correo`/`dependencia`/`tipoVinculo` (el curso no los necesita).
export const ingresarCursoSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    // Misma canonización que `registrarAsistenciaSchema`: la identidad del
    // funcionario colapsa a la forma normalizada para que la inscripción sea
    // resumible sin importar la grafía exacta de la cédula.
    documento: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .transform((d) => normalizarDocumento(d)),
  })
  .strict()
export type IngresarCursoInput = z.infer<typeof ingresarCursoSchema>

// `leccionId` viaja por el parámetro de ruta, no por el cuerpo.
export const marcarLeccionCompletadaSchema = z
  .object({
    documento: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .transform((d) => normalizarDocumento(d)),
  })
  .strict()
export type MarcarLeccionCompletadaInput = z.infer<
  typeof marcarLeccionCompletadaSchema
>

// ── Planificador ──────────────────────────────────────────────────────────────
// CRUD simple de agenda anual. `areaObjetivo` es texto libre (NO FK a `areas`).

export const crearCapacitacionPlaneadaSchema = z
  .object({
    titulo: z.string().trim().min(3).max(200),
    areaObjetivo: z.string().trim().max(200).optional(),
    ambito: z
      .enum(
        AMBITOS_CAPACITACION as unknown as [
          AmbitoCapacitacion,
          ...AmbitoCapacitacion[],
        ],
      )
      .optional(),
    anio: z.coerce.number().int().min(2020).max(2100),
    mes: z.coerce.number().int().min(1).max(12),
    notas: z.string().trim().max(2000).optional(),
  })
  .strict()
export type CrearCapacitacionPlaneadaInput = z.infer<
  typeof crearCapacitacionPlaneadaSchema
>

export const editarCapacitacionPlaneadaSchema = z
  .object({
    titulo: z.string().trim().min(3).max(200).optional(),
    areaObjetivo: z.string().trim().max(200).optional(),
    ambito: z
      .enum(
        AMBITOS_CAPACITACION as unknown as [
          AmbitoCapacitacion,
          ...AmbitoCapacitacion[],
        ],
      )
      .optional(),
    anio: z.coerce.number().int().min(2020).max(2100).optional(),
    mes: z.coerce.number().int().min(1).max(12).optional(),
    estado: z
      .enum(
        ESTADOS_CAPACITACION_PLANEADA as unknown as [
          EstadoCapacitacionPlaneada,
          ...EstadoCapacitacionPlaneada[],
        ],
      )
      .optional(),
    notas: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
export type EditarCapacitacionPlaneadaInput = z.infer<
  typeof editarCapacitacionPlaneadaSchema
>

export const filtroCapacitacionesPlaneadasSchema = z.object({
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
    .enum(
      ESTADOS_CAPACITACION_PLANEADA as unknown as [
        EstadoCapacitacionPlaneada,
        ...EstadoCapacitacionPlaneada[],
      ],
    )
    .optional(),
  anio: z.coerce.number().optional(),
  mes: z.coerce.number().optional(),
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(100).optional(),
})
export type FiltroCapacitacionesPlaneadasInput = z.infer<
  typeof filtroCapacitacionesPlaneadasSchema
>

// ── Administración de Personal ───────────────────────────────────────────────
// Alta/edición del maestro de empleados + puente al trámite + novedad ("Otro sí").
// Fechas ISO date (yyyy-mm-dd) validadas por regex (no dependemos de `z.date()`
// según versión de Zod). `.strict()` cierra el contrato HTTP.

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (use yyyy-mm-dd).")
const tipoVinculacionEnum = z.enum(
  TIPOS_VINCULACION as unknown as [TipoVinculacion, ...TipoVinculacion[]],
)
const nombreEmpleado = z.string().trim().min(2).max(160)
const cargoEmpleado = z.string().trim().min(2).max(160)
const areaEmpleado = z.string().trim().min(2).max(160)
const correoInstitucional = z.string().trim().email().max(200)
const telefonoEmpleado = z.string().trim().max(40)

export const crearEmpleadoSchema = z
  .object({
    documento: z.string().trim().min(3).max(30),
    nombreCompleto: nombreEmpleado,
    // Requerido al crear (aunque en BD sea nullable por las filas legacy).
    tipoVinculacion: tipoVinculacionEnum,
    cargo: cargoEmpleado,
    areaOrigen: areaEmpleado,
    fechaIngreso: fechaIso.optional(),
    fechaFinContrato: fechaIso.optional(),
    correoInstitucional: correoInstitucional.optional(),
    telefono: telefonoEmpleado.optional(),
  })
  .strict()
export type CrearEmpleadoInput = z.infer<typeof crearEmpleadoSchema>

// Edición del núcleo (el documento es identidad → no editable). Nullable para
// poder BORRAR un campo opcional; refine no-vacío rechaza el PATCH no-op.
export const editarEmpleadoSchema = z
  .object({
    nombreCompleto: nombreEmpleado.optional(),
    tipoVinculacion: tipoVinculacionEnum.optional(),
    cargo: cargoEmpleado.optional(),
    areaOrigen: areaEmpleado.optional(),
    fechaIngreso: fechaIso.nullable().optional(),
    fechaFinContrato: fechaIso.nullable().optional(),
    correoInstitucional: correoInstitucional.nullable().optional(),
    telefono: telefonoEmpleado.nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
export type EditarEmpleadoInput = z.infer<typeof editarEmpleadoSchema>

// Puente a Paz y Salvo: fija la fecha de retiro y dispara el trámite.
export const finalizarContratoSchema = z
  .object({ fechaRetiro: fechaIso })
  .strict()
export type FinalizarContratoInput = z.infer<typeof finalizarContratoSchema>

// "Otro sí" ligero (v1): unión discriminada por `tipo` → cada variante exige
// exactamente su dato (salario diferido a fase 2). El caso de uso aplica el
// cambio al empleado y registra la novedad append-only.
export const registrarNovedadSchema = z.discriminatedUnion("tipo", [
  z
    .object({
      tipo: z.literal("CAMBIO_CARGO"),
      motivo: z.string().trim().min(1).max(500),
      nuevoCargo: cargoEmpleado,
    })
    .strict(),
  z
    .object({
      tipo: z.literal("EXTENSION_CONTRATO"),
      motivo: z.string().trim().min(1).max(500),
      nuevaFechaFin: fechaIso,
    })
    .strict(),
])
export type RegistrarNovedadInput = z.infer<typeof registrarNovedadSchema>

// Filtro del catálogo de empleados (query params: sin `.strict()`).
export const filtroEmpleadosSchema = z.object({
  q: z.string().optional(),
  tipoVinculacion: tipoVinculacionEnum.optional(),
  vinculoEstado: z
    .enum(
      ESTADOS_VINCULACION as unknown as [EstadoVinculacion, ...EstadoVinculacion[]],
    )
    .optional(),
  pagina: z.coerce.number().int().min(1).optional(),
  porPagina: z.coerce.number().int().min(1).max(100).optional(),
})
export type FiltroEmpleadosInput = z.infer<typeof filtroEmpleadosSchema>

// ── Hoja de vida 360°: schemas por bloque ────────────────────────────────────
// Cada bloque valida su forma con `.strict()`. Los enums se tipan con las uniones
// del dominio (no `string`). Fechas ISO reusan `fechaIso`. Todos los campos
// opcionales son `.nullable().optional()` para permitir crear/borrar por bloque.

const tipoContratoEnum = z.enum(
  TIPOS_CONTRATO as unknown as [TipoContrato, ...TipoContrato[]],
)
const modalidadEnum = z.enum(MODALIDADES as unknown as [Modalidad, ...Modalidad[]])
const generoEnum = z.enum(GENEROS as unknown as [Genero, ...Genero[]])
const parentescoEnum = z.enum(
  PARENTESCOS as unknown as [Parentesco, ...Parentesco[]],
)
const nivelFormacionEnum = z.enum(
  NIVELES_FORMACION as unknown as [NivelFormacion, ...NivelFormacion[]],
)
const anio = z.coerce.number().int().min(1900).max(2100)

// Bloque contractual (1-1 sobre `funcionarios`). PATCH: refine no-vacío.
export const editarContractualSchema = z
  .object({
    areaId: z.string().uuid().nullable().optional(),
    tipoContrato: tipoContratoEnum.nullable().optional(),
    modalidad: modalidadEnum.nullable().optional(),
    programa: z.string().trim().max(160).nullable().optional(),
    escalafon: z.string().trim().max(80).nullable().optional(),
    jefeInmediato: z.string().trim().max(160).nullable().optional(),
    fechaPrimerIngreso: fechaIso.nullable().optional(),
    observacion: z.string().trim().max(1000).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
export type EditarContractualInput = z.infer<typeof editarContractualSchema>

// Bloque personal (1-1). Upsert completo (todos opcionales/nullable).
export const guardarPersonalesSchema = z
  .object({
    fechaExpedicion: fechaIso.nullable().optional(),
    lugarExpedicion: z.string().trim().max(160).nullable().optional(),
    fechaNacimiento: fechaIso.nullable().optional(),
    lugarNacimiento: z.string().trim().max(160).nullable().optional(),
    genero: generoEnum.nullable().optional(),
    direccion: z.string().trim().max(200).nullable().optional(),
    barrio: z.string().trim().max(120).nullable().optional(),
    municipio: z.string().trim().max(120).nullable().optional(),
    correoPersonal: z.string().trim().email().max(200).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
export type GuardarPersonalesInput = z.infer<typeof guardarPersonalesSchema>

// Familiar (1-N). Alta de un registro.
export const crearFamiliarSchema = z
  .object({
    parentesco: parentescoEnum,
    nombre: z.string().trim().min(2).max(160),
    fechaNacimiento: fechaIso.optional(),
    genero: generoEnum.optional(),
  })
  .strict()
export type CrearFamiliarInput = z.infer<typeof crearFamiliarSchema>

// Formación (1-N). `anioFin >= anioInicio` cuando ambos vienen.
export const crearFormacionSchema = z
  .object({
    nivel: nivelFormacionEnum,
    titulo: z.string().trim().min(2).max(200),
    institucion: z.string().trim().max(200).optional(),
    anioInicio: anio.optional(),
    anioFin: anio.optional(),
  })
  .strict()
  .refine(
    (o) => o.anioInicio == null || o.anioFin == null || o.anioFin >= o.anioInicio,
    { message: "El año de fin no puede ser anterior al de inicio.", path: ["anioFin"] },
  )
export type CrearFormacionInput = z.infer<typeof crearFormacionSchema>

// Experiencia (1-N). `fechaFin >= fechaInicio` cuando ambas vienen.
export const crearExperienciaSchema = z
  .object({
    empresa: z.string().trim().min(2).max(200),
    cargo: z.string().trim().min(2).max(160),
    fechaInicio: fechaIso.optional(),
    fechaFin: fechaIso.optional(),
    descripcion: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (o) => o.fechaInicio == null || o.fechaFin == null || o.fechaFin >= o.fechaInicio,
    { message: "La fecha de fin no puede ser anterior a la de inicio.", path: ["fechaFin"] },
  )
export type CrearExperienciaInput = z.infer<typeof crearExperienciaSchema>

// Bloque salarial (1-1, SENSIBLE). Upsert; montos no negativos.
const monto = z.coerce.number().min(0).max(9_999_999_999)
export const guardarSalarialSchema = z
  .object({
    salarioBasico: monto.nullable().optional(),
    auxilioTransporte: monto.nullable().optional(),
    promedioDevengado: monto.nullable().optional(),
    valorEnLetras: z.string().trim().max(200).nullable().optional(),
    honorarios: monto.nullable().optional(),
    eps: z.string().trim().max(120).nullable().optional(),
    afp: z.string().trim().max(120).nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Debe modificar al menos un campo.",
  })
export type GuardarSalarialInput = z.infer<typeof guardarSalarialSchema>

// Foto del empleado (Storage): persiste la ruta del objeto tras subir con URL
// firmada. `null` borra la foto actual (vuelve al fallback de iniciales).
export const guardarFotoSchema = z
  .object({ fotoPath: z.string().trim().min(1).max(500).nullable() })
  .strict()
export type GuardarFotoInput = z.infer<typeof guardarFotoSchema>

// Paso 1 de la subida: pide la URL firmada para la extensión del archivo elegido.
export const crearUrlSubidaFotoSchema = z
  .object({ extension: z.string().trim().min(1).max(10) })
  .strict()
export type CrearUrlSubidaFotoInput = z.infer<typeof crearUrlSubidaFotoSchema>
