import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  unique,
  jsonb,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// ── Enums ──────────────────────────────────────────────────────────────────

export const estadoAreaEnum = pgEnum("estado_area", [
  "PENDIENTE",
  "APROBADO",
  "NO_APLICA",
  "NO_APROBADO",
  "DEVUELTO_POR_CI",
])

export const estadoGlobalEnum = pgEnum("estado_global", [
  "PENDIENTE",
  "LISTO_PARA_LIQUIDAR",
  "LIQUIDACION_GENERADA",
  "PAZ_Y_SALVO",
])

export const rolUsuarioEnum = pgEnum("rol_usuario", [
  "SUPERADMIN",
  "TALENTO_HUMANO",
  "CONTROL_INTERNO",
  "AREA",
  "SST",
])

export const ambitoCapacitacionEnum = pgEnum("ambito_capacitacion", ["TH", "SST"])

export const estadoRegistroEnum = pgEnum("estado_registro_capacitacion", [
  "BORRADOR",
  "ABIERTO",
  "CERRADO",
])

export const tipoVinculoEnum = pgEnum("tipo_vinculo", [
  "PLANTA",
  "CONTRATISTA",
  "EXTERNO",
])

export const estadoUsuarioEnum = pgEnum("estado_usuario", [
  "PENDIENTE",
  "ACTIVO",
  "INACTIVO",
])

export const tipoVinculacionEnum = pgEnum("tipo_vinculacion", [
  "ADMINISTRATIVO",
  "DOCENTE",
  "OPS",
])

export const novedadTipoEnum = pgEnum("novedad_tipo", [
  "CAMBIO_CARGO",
  "EXTENSION_CONTRATO",
])

export const tipoContenidoLeccionEnum = pgEnum("tipo_contenido_leccion", ["TEXTO", "VIDEO"])
export const estadoCapacitacionPlaneadaEnum = pgEnum("estado_capacitacion_planeada", [
  "PLANEADA",
  "EN_CURSO",
  "COMPLETADA",
])

// ── Hoja de vida 360° (Administración de Personal v2) ──
export const tipoContratoEnum = pgEnum("tipo_contrato", [
  "TERMINO_FIJO",
  "TERMINO_INDEFINIDO",
  "OBRA_LABOR",
  "PRESTACION_SERVICIOS",
])

export const modalidadEnum = pgEnum("modalidad", ["PRESENCIAL", "HIBRIDO", "VIRTUAL"])

export const generoEnum = pgEnum("genero", ["MASCULINO", "FEMENINO", "OTRO"])

export const parentescoEnum = pgEnum("parentesco", [
  "CONYUGE",
  "HIJO",
  "PADRE",
  "MADRE",
  "OTRO",
])

export const nivelFormacionEnum = pgEnum("nivel_formacion", [
  "BACHILLER",
  "TECNICO",
  "TECNOLOGO",
  "PROFESIONAL",
  "ESPECIALIZACION",
  "MAESTRIA",
  "DOCTORADO",
  "POSTDOCTORADO",
])

// ── Sync de personal (Iceberg, migración 0019) ──
export const tipoDocumentoEnum = pgEnum("tipo_documento", [
  "CC",
  "CE",
  "PASAPORTE",
  "PEP",
  "TI",
  "NIT",
])

export const estadoCivilEnum = pgEnum("estado_civil", [
  "SOLTERO",
  "CASADO",
  "UNION_LIBRE",
  "SEPARADO",
  "DIVORCIADO",
  "VIUDO",
])

export const tipoCuentaBancariaEnum = pgEnum("tipo_cuenta_bancaria", [
  "AHORROS",
  "CORRIENTE",
])

export const origenLoteSyncEnum = pgEnum("origen_lote_sync", ["SERVICIO", "MANUAL"])

// ── Vacantes (migración 0020) ──
export const estadoVacanteEnum = pgEnum("estado_vacante", [
  "PENDIENTE",
  "CONTRATADO",
  "CANCELADA",
  "CERRADA_PROMOCION",
  "PAUSADA",
])

export const faseVacanteEnum = pgEnum("fase_vacante", [
  "RECLUTAMIENTO",
  "APROBACION_VICERRECTORIA",
  "PRUEBAS_IDONEIDAD",
  "PRUEBAS_PSICOTECNICAS",
  "EXAMEN_MEDICO",
  "POLIGRAFIA",
  "CONTRATACION",
])

export const aprobacionPresupuestoVacanteEnum = pgEnum("aprobacion_presupuesto_vacante", [
  "SOLICITADO",
  "EN_REVISION",
  "APROBADO",
  "NO_APROBADO",
])

// ── areas ──────────────────────────────────────────────────────────────────

export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull().unique(),
  activa: boolean("activa").notNull().default(true),
})

// ── funcionarios ──────────────────────────────────────────────────────────

export const funcionarios = pgTable("funcionarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  documento: text("documento").notNull().unique(),
  nombreCompleto: text("nombre_completo").notNull(),
  // `fecha_retiro` es NULL para un empleado ACTIVO (sin trámite). Se setea en
  // "Finalizar contrato" → la misma fila entra a Paz y Salvo. Ver migración 0009.
  fechaRetiro: date("fecha_retiro"),
  areaOrigen: text("area_origen").notNull(),
  cargo: text("cargo").notNull(),
  // ── Núcleo del maestro de empleados (Administración de Personal v1) ──
  tipoVinculacion: tipoVinculacionEnum("tipo_vinculacion"),
  fechaIngreso: date("fecha_ingreso"),
  fechaFinContrato: date("fecha_fin_contrato"),
  correoInstitucional: text("correo_institucional"),
  telefono: text("telefono"),
  // ── Contractual extendido (Hoja de vida 360°, migración 0010) ──
  areaId: uuid("area_id").references(() => areas.id),
  tipoContrato: tipoContratoEnum("tipo_contrato"),
  modalidad: modalidadEnum("modalidad"),
  programa: text("programa"),
  escalafon: text("escalafon"),
  jefeInmediato: text("jefe_inmediato"),
  fechaPrimerIngreso: date("fecha_primer_ingreso"),
  observacion: text("observacion"),
  fotoPath: text("foto_path"),
  // ── Atributos Iceberg no sensibles (migración 0019) ──
  tipoDocumento: tipoDocumentoEnum("tipo_documento"),
  nacionalidad: text("nacionalidad"),
  centroCostos: text("centro_costos"),
  categoria: text("categoria"),
  fondoSedeId: uuid("fondo_sede_id").references(() => fondosSede.id),
  estadoGlobal: estadoGlobalEnum("estado_global").notNull().default("PENDIENTE"),
  fechaLiquidacion: timestamp("fecha_liquidacion", { withTimezone: true }),
  fechaLiquidacionGenerada: timestamp("fecha_liquidacion_generada", { withTimezone: true }),
  liquidacionGeneradaPor: text("liquidacion_generada_por"),
  liquidadoPor: text("liquidado_por"),
  archivadoEn: timestamp("archivado_en", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── aprobaciones ──────────────────────────────────────────────────────────

export const aprobaciones = pgTable(
  "aprobaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    funcionarioId: uuid("funcionario_id")
      .notNull()
      .references(() => funcionarios.id),
    areaId: uuid("area_id")
      .notNull()
      .references(() => areas.id),
    estado: estadoAreaEnum("estado").notNull().default("PENDIENTE"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.funcionarioId, t.areaId)],
)

// ── observaciones ─────────────────────────────────────────────────────────

export const observaciones = pgTable("observaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  funcionarioId: uuid("funcionario_id")
    .notNull()
    .references(() => funcionarios.id),
  areaId: uuid("area_id")
    .notNull()
    .references(() => areas.id),
  estado: estadoAreaEnum("estado").notNull(),
  texto: text("texto").notNull(),
  autor: text("autor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── usuarios ──────────────────────────────────────────────────────────────

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  rol: rolUsuarioEnum("rol").notNull().default("AREA"),
  areaId: uuid("area_id").references(() => areas.id),
  estado: estadoUsuarioEnum("estado").notNull().default("PENDIENTE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── capacitaciones ────────────────────────────────────────────────────────────

export const capacitaciones = pgTable("capacitaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  ambito: ambitoCapacitacionEnum("ambito").notNull(),
  lugar: text("lugar"),
  instructor: text("instructor"),
  iniciaEn: timestamp("inicia_en", { withTimezone: true }).notNull(),
  terminaEn: timestamp("termina_en", { withTimezone: true }).notNull(),
  horas: numeric("horas", { precision: 5, scale: 2 }),
  token: text("token").notNull().unique(),
  estadoRegistro: estadoRegistroEnum("estado_registro").notNull().default("BORRADOR"),
  creadaPor: text("creada_por"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── asistencias ───────────────────────────────────────────────────────────────
// Identidad capturada de forma autónoma (no se enlaza a `funcionarios`).
// `usuario_id` enlaza a la cuenta solo si el asistente estaba logueado. El UNIQUE
// (capacitación × documento) da idempotencia ante doble escaneo/submit.

export const asistencias = pgTable(
  "asistencias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    capacitacionId: uuid("capacitacion_id")
      .notNull()
      .references(() => capacitaciones.id, { onDelete: "cascade" }),
    nombre: text("nombre").notNull(),
    documento: text("documento").notNull(),
    correo: text("correo"),
    dependencia: text("dependencia"),
    tipoVinculo: tipoVinculoEnum("tipo_vinculo").notNull(),
    usuarioId: uuid("usuario_id").references(() => usuarios.id),
    registradaEn: timestamp("registrada_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.capacitacionId, t.documento)],
)

// ── cursos ────────────────────────────────────────────────────────────────────

export const cursos = pgTable("cursos", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  ambito: ambitoCapacitacionEnum("ambito").notNull(),
  token: text("token").notNull().unique(),
  estadoRegistro: estadoRegistroEnum("estado_registro").notNull().default("BORRADOR"),
  creadaPor: text("creada_por"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── curso_modulos ─────────────────────────────────────────────────────────────
// Orden denso por curso, mismo patrón que `areas.orden`.

export const cursoModulos = pgTable(
  "curso_modulos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => cursos.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    orden: integer("orden").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.cursoId, t.orden)],
)

// ── curso_lecciones ───────────────────────────────────────────────────────────

export const cursoLecciones = pgTable(
  "curso_lecciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduloId: uuid("modulo_id")
      .notNull()
      .references(() => cursoModulos.id, { onDelete: "cascade" }),
    titulo: text("titulo").notNull(),
    tipoContenido: tipoContenidoLeccionEnum("tipo_contenido").notNull(),
    contenidoTexto: text("contenido_texto"),
    urlVideo: text("url_video"),
    orden: integer("orden").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.moduloId, t.orden)],
)

// ── inscripciones ─────────────────────────────────────────────────────────────
// Idempotente por curso × documento, mismo patrón que `asistencias`.

export const inscripciones = pgTable(
  "inscripciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cursoId: uuid("curso_id")
      .notNull()
      .references(() => cursos.id, { onDelete: "cascade" }),
    documento: text("documento").notNull(),
    nombre: text("nombre").notNull(),
    correo: text("correo"),
    iniciadaEn: timestamp("iniciada_en", { withTimezone: true }).notNull().defaultNow(),
    ultimaActividadEn: timestamp("ultima_actividad_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.cursoId, t.documento)],
)

// ── progreso_lecciones ────────────────────────────────────────────────────────
// Existencia de fila = completada; idempotente por inscripción × lección.

export const progresoLecciones = pgTable(
  "progreso_lecciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inscripcionId: uuid("inscripcion_id")
      .notNull()
      .references(() => inscripciones.id, { onDelete: "cascade" }),
    leccionId: uuid("leccion_id")
      .notNull()
      .references(() => cursoLecciones.id, { onDelete: "cascade" }),
    completadaEn: timestamp("completada_en", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.inscripcionId, t.leccionId)],
)

// ── capacitaciones_planeadas ──────────────────────────────────────────────────
// Planificador liviano. `area_objetivo` es texto libre (sin FK a `areas`),
// decisión de producto ya confirmada.

export const capacitacionesPlaneadas = pgTable("capacitaciones_planeadas", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  areaObjetivo: text("area_objetivo"),
  ambito: ambitoCapacitacionEnum("ambito").notNull(),
  anio: integer("anio").notNull(),
  mes: integer("mes").notNull(),
  estado: estadoCapacitacionPlaneadaEnum("estado").notNull().default("PLANEADA"),
  notas: text("notas"),
  creadaPor: text("creada_por"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── novedades ───────────────────────────────────────────────────────────────────
// Bitácora append-only del "Otro sí" ligero (cambio de cargo / extensión de
// contrato). Cada novedad también aplica el cambio al empleado. Ver migración 0009.

export const novedades = pgTable("novedades", {
  id: uuid("id").primaryKey().defaultRandom(),
  funcionarioId: uuid("funcionario_id")
    .notNull()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  tipo: novedadTipoEnum("tipo").notNull(),
  motivo: text("motivo").notNull(),
  valorAnterior: text("valor_anterior"),
  valorNuevo: text("valor_nuevo"),
  autor: text("autor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/** Bitácora de auditoría institucional, genérica y append-only (0016). */
export const eventosAuditoria = pgTable("eventos_auditoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  entidadTipo: text("entidad_tipo").notNull(),
  entidadId: uuid("entidad_id").notNull(),
  accion: text("accion").notNull(),
  actorId: uuid("actor_id"),
  actorNombre: text("actor_nombre").notNull(),
  estadoAnterior: jsonb("estado_anterior"),
  estadoNuevo: jsonb("estado_nuevo"),
  observacion: text("observacion"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── Importación masiva de desvinculaciones (0017) ────────────────────────────

export const loteEstadoEnum = pgEnum("lote_estado", [
  "CARGADO",
  "PREVISUALIZADO",
  "CONFIRMADO_PARCIAL",
  "CONFIRMADO_TOTAL",
])

export const filaLoteEstadoEnum = pgEnum("fila_lote_estado", [
  "VALIDA",
  "CON_ERROR",
  "DUPLICADA",
  "CONFIRMADA",
  "DESCARTADA",
])

export const lotesImportacion = pgTable("lotes_importacion", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombreArchivo: text("nombre_archivo").notNull(),
  estado: loteEstadoEnum("estado").notNull().default("CARGADO"),
  totalFilas: integer("total_filas").notNull().default(0),
  filasConfirmadas: integer("filas_confirmadas").notNull().default(0),
  creadoPor: text("creado_por").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const filasLote = pgTable(
  "filas_lote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lotesImportacion.id, { onDelete: "cascade" }),
    numeroFila: integer("numero_fila").notNull(),
    documento: text("documento").notNull(),
    nombreCompleto: text("nombre_completo").notNull(),
    fechaRetiro: date("fecha_retiro").notNull(),
    cargo: text("cargo"),
    estado: filaLoteEstadoEnum("estado").notNull(),
    mensajeError: text("mensaje_error"),
    funcionarioId: uuid("funcionario_id").references(() => funcionarios.id),
  },
  (t) => [unique().on(t.loteId, t.numeroFila)],
)

// ── Hoja de vida 360°: tablas satélite (migración 0010) ─────────────────────────
// Reparten el expediente por afinidad y sensibilidad para no inflar `funcionarios`
// con 36 columnas nullables. `empleado_salarial` está aislada por su RLS estricta.

export const empleadoPersonales = pgTable("empleado_personales", {
  funcionarioId: uuid("funcionario_id")
    .primaryKey()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  fechaExpedicion: date("fecha_expedicion"),
  lugarExpedicion: text("lugar_expedicion"),
  fechaNacimiento: date("fecha_nacimiento"),
  lugarNacimiento: text("lugar_nacimiento"),
  genero: generoEnum("genero"),
  direccion: text("direccion"),
  barrio: text("barrio"),
  municipio: text("municipio"),
  correoPersonal: text("correo_personal"),
  // ── Atributos Iceberg (migración 0019) ──
  estadoCivil: estadoCivilEnum("estado_civil"),
  lugarResidencia: text("lugar_residencia"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const empleadoFamiliares = pgTable("empleado_familiares", {
  id: uuid("id").primaryKey().defaultRandom(),
  funcionarioId: uuid("funcionario_id")
    .notNull()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  parentesco: parentescoEnum("parentesco").notNull(),
  nombre: text("nombre").notNull(),
  fechaNacimiento: date("fecha_nacimiento"),
  genero: generoEnum("genero"),
  // "Persona a cargo" de Iceberg: el familiar depende económicamente (0019).
  dependienteEconomico: boolean("dependiente_economico").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const empleadoFormacion = pgTable("empleado_formacion", {
  id: uuid("id").primaryKey().defaultRandom(),
  funcionarioId: uuid("funcionario_id")
    .notNull()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  nivel: nivelFormacionEnum("nivel").notNull(),
  titulo: text("titulo").notNull(),
  institucion: text("institucion"),
  anioInicio: integer("anio_inicio"),
  anioFin: integer("anio_fin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const empleadoExperiencia = pgTable("empleado_experiencia", {
  id: uuid("id").primaryKey().defaultRandom(),
  funcionarioId: uuid("funcionario_id")
    .notNull()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  empresa: text("empresa").notNull(),
  cargo: text("cargo").notNull(),
  fechaInicio: date("fecha_inicio"),
  fechaFin: date("fecha_fin"),
  descripcion: text("descripcion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// SENSIBLE: RLS estricta (solo SA/TH). OPS usa honorarios; admin/docente salario.
export const empleadoSalarial = pgTable("empleado_salarial", {
  funcionarioId: uuid("funcionario_id")
    .primaryKey()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  salarioBasico: numeric("salario_basico", { precision: 14, scale: 2 }),
  auxilioTransporte: numeric("auxilio_transporte", { precision: 14, scale: 2 }),
  promedioDevengado: numeric("promedio_devengado", { precision: 14, scale: 2 }),
  valorEnLetras: text("valor_en_letras"),
  honorarios: numeric("honorarios", { precision: 14, scale: 2 }),
  eps: text("eps"),
  afp: text("afp"),
  // Fondo de cesantías (Iceberg lo trae junto a la pensión; migración 0019).
  fondoCesantias: text("fondo_cesantias"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ── Sync de personal (Iceberg, migración 0019) ───────────────────────────────
// Catálogo de sedes (estilo `areas`), bloque bancario sensible (placeholder) y
// staging (lote → filas) que reusa `lote_estado`/`fila_lote_estado` de 0017.

export const fondosSede = pgTable("fondos_sede", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  activo: boolean("activo").notNull().default(true),
})

// SENSIBLE: RLS estricta (solo SA/TH, `ve_bancario`). Estructura PLACEHOLDER.
export const empleadoBancario = pgTable("empleado_bancario", {
  funcionarioId: uuid("funcionario_id")
    .primaryKey()
    .references(() => funcionarios.id, { onDelete: "cascade" }),
  banco: text("banco"),
  tipoCuenta: tipoCuentaBancariaEnum("tipo_cuenta"),
  numeroCuenta: text("numero_cuenta"),
  titular: text("titular"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const lotesSyncPersonal = pgTable("lotes_sync_personal", {
  id: uuid("id").primaryKey().defaultRandom(),
  origen: origenLoteSyncEnum("origen").notNull(),
  estado: loteEstadoEnum("estado").notNull().default("CARGADO"),
  totalFilas: integer("total_filas").notNull().default(0),
  filasConfirmadas: integer("filas_confirmadas").notNull().default(0),
  creadoPor: text("creado_por").notNull(),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// Una fila por registro de Iceberg, NORMALIZADO a columna-por-atributo.
export const filasSyncPersonal = pgTable(
  "filas_sync_personal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    loteId: uuid("lote_id")
      .notNull()
      .references(() => lotesSyncPersonal.id, { onDelete: "cascade" }),
    numeroFila: integer("numero_fila").notNull(),
    // Identidad / core
    documento: text("documento").notNull(),
    nombreCompleto: text("nombre_completo").notNull(),
    // Personales
    genero: generoEnum("genero"),
    tipoDocumento: tipoDocumentoEnum("tipo_documento"),
    fechaExpedicion: date("fecha_expedicion"),
    nacionalidad: text("nacionalidad"),
    fechaNacimiento: date("fecha_nacimiento"),
    lugarResidencia: text("lugar_residencia"),
    direccion: text("direccion"),
    telefono: text("telefono"),
    barrio: text("barrio"),
    estadoCivil: estadoCivilEnum("estado_civil"),
    personasACargo: integer("personas_a_cargo"),
    correo: text("correo"),
    // Contractual
    cargo: text("cargo"),
    estadoContrato: text("estado_contrato"),
    centroCostos: text("centro_costos"),
    fondoSede: text("fondo_sede"),
    fechaIngreso: date("fecha_ingreso"),
    fechaFinContrato: date("fecha_fin_contrato"),
    dependencia: text("dependencia"),
    tipoEmpleado: tipoVinculacionEnum("tipo_empleado"),
    tipoContrato: tipoContratoEnum("tipo_contrato"),
    categoria: text("categoria"),
    // Salarial (sensible)
    salario: numeric("salario", { precision: 14, scale: 2 }),
    eps: text("eps"),
    fondoPensionCesantias: text("fondo_pension_cesantias"),
    // Bancario (sensible, placeholder)
    certificadoBancario: text("certificado_bancario"),
    // Resultado de validación
    estado: filaLoteEstadoEnum("estado").notNull(),
    mensajeError: text("mensaje_error"),
    funcionarioId: uuid("funcionario_id").references(() => funcionarios.id),
  },
  (t) => [unique().on(t.loteId, t.numeroFila)],
)

// ── Vacantes (migración 0020) ─────────────────────────────────────────────────
// Catálogos con llave (estilo `fondos_sede`): `clave` (UPPER_SNAKE) es lo que el
// dominio compara (`shared/src/vacantes.ts`), `nombre` es el display.

export const vacanteModalidades = pgTable("vacante_modalidades", {
  id: uuid("id").primaryKey().defaultRandom(),
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull(),
})

export const vacanteDedicaciones = pgTable("vacante_dedicaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull(),
})

export const vacanteEscalafones = pgTable("vacante_escalafones", {
  id: uuid("id").primaryKey().defaultRandom(),
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull(),
})

export const vacanteMotivos = pgTable("vacante_motivos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull(),
})

export const vacanteFuentes = pgTable("vacante_fuentes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull(),
})

// Catálogo dedicado de área/programa (migración 0021) — `areas` es el
// catálogo de dependencias que dan visto bueno en paz y salvo, un dominio
// distinto y sin traslape con el área/programa de una vacante.
export const vacanteAreas = pgTable("vacante_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  clave: text("clave").notNull().unique(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").notNull().default(true),
  orden: integer("orden").notNull(),
})

// Solo campos CAPTURADOS. Los derivados (STATUS, días para vencer, días en
// proceso, avisos) NUNCA se persisten — se recalculan en cada lectura vía
// `derivarVacante`/`evaluarFila` (`shared/src/vacantes.ts`).
export const vacantes = pgTable("vacantes", {
  id: uuid("id").primaryKey().defaultRandom(),
  requerimiento: text("requerimiento")
    .notNull()
    .default(sql`('REQ-' || lpad(nextval('vacantes_requerimiento_seq')::text, 6, '0'))`),
  cargo: text("cargo").notNull(),
  posiciones: integer("posiciones").notNull().default(1),
  areaId: uuid("area_id").references(() => vacanteAreas.id),
  modalidadId: uuid("modalidad_id").references(() => vacanteModalidades.id),
  dedicacionId: uuid("dedicacion_id").references(() => vacanteDedicaciones.id),
  escalafonId: uuid("escalafon_id").references(() => vacanteEscalafones.id),
  motivoId: uuid("motivo_id").references(() => vacanteMotivos.id),
  fuenteId: uuid("fuente_id").references(() => vacanteFuentes.id),
  jefe: text("jefe"),
  reemplazo: text("reemplazo"),
  nombreNuevo: text("nombre_nuevo"),
  salario: numeric("salario", { precision: 14, scale: 2 }),
  aprobacion: aprobacionPresupuestoVacanteEnum("aprobacion"),
  fechaAprobacion: date("fecha_aprobacion"),
  fechaRequerimiento: date("fecha_requerimiento").notNull(),
  fase: faseVacanteEnum("fase").notNull().default("RECLUTAMIENTO"),
  estado: estadoVacanteEnum("estado").notNull().default("PENDIENTE"),
  fechaContratacion: date("fecha_contratacion"),
  cedula: text("cedula"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
