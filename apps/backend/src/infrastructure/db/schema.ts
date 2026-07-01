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
  fechaRetiro: date("fecha_retiro").notNull(),
  areaOrigen: text("area_origen").notNull(),
  cargo: text("cargo").notNull(),
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
