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
} from "drizzle-orm/pg-core"

// ── Enums ──────────────────────────────────────────────────────────────────

export const estadoAreaEnum = pgEnum("estado_area", [
  "PENDIENTE",
  "APROBADO",
  "NO_APLICA",
  "NO_APROBADO",
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
  estadoGlobal: estadoGlobalEnum("estado_global").notNull().default("PENDIENTE"),
  fechaLiquidacion: timestamp("fecha_liquidacion", { withTimezone: true }),
  fechaLiquidacionGenerada: timestamp("fecha_liquidacion_generada", { withTimezone: true }),
  liquidacionGeneradaPor: text("liquidacion_generada_por"),
  liquidadoPor: text("liquidado_por"),
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
