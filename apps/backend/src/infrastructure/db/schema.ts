import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
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
