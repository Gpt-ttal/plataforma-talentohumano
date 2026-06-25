/**
 * seed.ts — Datos semilla (fuente única de verdad).
 * Usado por el store en memoria (demo) y reflejado en supabase/seed.sql (prod).
 *
 * - 10 áreas de visto bueno (del sistema original).
 * - 9 funcionarios reales tomados del Excel base.
 * - Variedad realista en las aprobaciones para que la demo muestre los 3 estados
 *   y un dashboard con datos significativos.
 */

import type { AreaVistoBueno, EstadoArea, EstadoUsuario, RolUsuario } from "./domain.js";

/** IDs deterministas para que el store en memoria y Supabase coincidan. */
const areaId = (n: number) =>
  `a0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const funcId = (n: number) =>
  `f0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const usuarioId = (n: number) =>
  `e0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

export const AREAS_SEED: AreaVistoBueno[] = [
  { id: areaId(1), nombre: "Activos fijos", orden: 1, activa: true },
  { id: areaId(2), nombre: "Sistemas de información", orden: 2, activa: true },
  { id: areaId(3), nombre: "Iceberg", orden: 3, activa: true },
  { id: areaId(4), nombre: "Sinu", orden: 4, activa: true },
  { id: areaId(5), nombre: "Eva", orden: 5, activa: true },
  { id: areaId(6), nombre: "Tesorería", orden: 6, activa: true },
  { id: areaId(7), nombre: "Contabilidad", orden: 7, activa: true },
  { id: areaId(8), nombre: "Carnetización", orden: 8, activa: true },
  { id: areaId(9), nombre: "Biblioteca", orden: 9, activa: true },
  { id: areaId(10), nombre: "Inhabilitar correos", orden: 10, activa: true },
];

/** Usuario semilla (modo demo y bootstrap de Supabase). */
export interface UsuarioSeed {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  /** orden del área (1..10) si el rol es AREA; null en otro caso. */
  area: number | null;
  estado: EstadoUsuario;
}

/**
 * Usuarios demo: cubren los cuatro roles y un PENDIENTE para probar la asignación.
 * En producción el alta real ocurre por autoregistro (Google); estos solo siembran
 * el modo demo y el bootstrap del superadmin.
 */
export const USUARIOS_SEED: UsuarioSeed[] = [
  {
    id: usuarioId(1),
    email: "leonardoreales@americana.edu.co",
    nombre: "Leonardo Reales",
    rol: "SUPERADMIN",
    area: null,
    estado: "ACTIVO",
  },
  {
    id: usuarioId(2),
    email: "talento.humano@americana.edu.co",
    nombre: "Talento Humano",
    rol: "TALENTO_HUMANO",
    area: null,
    estado: "ACTIVO",
  },
  {
    id: usuarioId(3),
    email: "control.interno@americana.edu.co",
    nombre: "Control Interno",
    rol: "CONTROL_INTERNO",
    area: null,
    estado: "ACTIVO",
  },
  {
    id: usuarioId(4),
    email: "contabilidad@americana.edu.co",
    nombre: "Coordinación Contabilidad",
    rol: "AREA",
    area: 7, // Contabilidad
    estado: "ACTIVO",
  },
  {
    id: usuarioId(5),
    email: "tesoreria@americana.edu.co",
    nombre: "Coordinación Tesorería",
    rol: "AREA",
    area: 6, // Tesorería
    estado: "ACTIVO",
  },
  {
    id: usuarioId(6),
    email: "nuevo@americana.edu.co",
    nombre: "Usuario Nuevo",
    rol: "AREA",
    area: null,
    estado: "PENDIENTE",
  },
];

export interface ObservacionSeed {
  /** orden del área (1..10) */
  area: number;
  estado: EstadoArea;
  texto: string;
}

export interface FuncionarioSeed {
  id: string;
  documento: string;
  nombreCompleto: string;
  fechaRetiro: string; // yyyy-mm-dd
  areaOrigen: string;
  cargo: string;
  /** Hito de Talento Humano (avisa a Control Interno). */
  fechaLiquidacionGenerada?: string | null;
  liquidacionGeneradaPor?: string | null;
  /** Hito de Control Interno (cierre final → paz y salvo). */
  fechaLiquidacion: string | null;
  liquidadoPor?: string | null;
  /** Overrides de estado por orden de área (1..10). Default: PENDIENTE. */
  aprobaciones?: Record<number, EstadoArea>;
  observaciones?: ObservacionSeed[];
}

const TODAS_OK: Record<number, EstadoArea> = {
  1: "APROBADO",
  2: "APROBADO",
  3: "NO_APLICA",
  4: "APROBADO",
  5: "APROBADO",
  6: "APROBADO",
  7: "APROBADO",
  8: "APROBADO",
  9: "NO_APLICA",
  10: "APROBADO",
};

export const FUNCIONARIOS_SEED: FuncionarioSeed[] = [
  {
    id: funcId(1),
    documento: "1234892621",
    nombreCompleto: "MERIÑO MENDIVIL ROGER MOISES",
    fechaRetiro: "2026-04-08",
    areaOrigen: "MERCADEO Y COMUNICACIONES",
    cargo: "LIDER COMERCIAL",
    fechaLiquidacion: null,
    // Todas las áreas OK pero sin liquidar => LISTO_PARA_LIQUIDAR
    aprobaciones: { ...TODAS_OK },
  },
  {
    id: funcId(2),
    documento: "1047050289",
    nombreCompleto: "ARRIETA MANJARRES ELKIN ANDRES",
    fechaRetiro: "2026-04-18",
    areaOrigen: "INFRAESTRUCTURA",
    cargo: "APRENDIZ",
    fechaLiquidacion: null,
    // Progreso parcial => PENDIENTE
    aprobaciones: { 1: "APROBADO", 2: "APROBADO", 8: "NO_APLICA" },
  },
  {
    id: funcId(3),
    documento: "1104256681",
    nombreCompleto: "ARRIETA HERNANDEZ ENA MARIA",
    fechaRetiro: "2026-04-17",
    areaOrigen: "CARTERA",
    cargo: "AUXILIAR DE CARTERA",
    fechaLiquidacion: null,
    // Un rechazo => PENDIENTE con hayRechazo
    aprobaciones: { 1: "APROBADO", 6: "NO_APROBADO", 7: "APROBADO" },
    observaciones: [
      {
        area: 6,
        estado: "NO_APROBADO",
        texto: "Pendiente devolución de anticipo de viáticos antes de aprobar.",
      },
    ],
  },
  {
    id: funcId(4),
    documento: "1047511448",
    nombreCompleto: "CARRACEDO CORTES JORGE ENRIQUE",
    fechaRetiro: "2026-04-17",
    areaOrigen: "ADMISIONES, REGISTRO Y CONTROL",
    cargo: "AUXILIAR DE ADMISIONES",
    // Todas OK + TH ya generó la liquidación (sin cerrar) => LIQUIDACION_GENERADA
    aprobaciones: { ...TODAS_OK },
    fechaLiquidacionGenerada: "2026-03-20T14:30:00.000Z",
    liquidacionGeneradaPor: "Talento Humano",
    fechaLiquidacion: null,
  },
  {
    id: funcId(5),
    documento: "1001825822",
    nombreCompleto: "DE LA ROSA SABALZA DANIELA SARAY",
    fechaRetiro: "2026-04-17",
    areaOrigen: "MERCADEO Y COMUNICACIONES",
    cargo: "ASESOR COMERCIAL",
    fechaLiquidacion: null,
  },
  {
    id: funcId(6),
    documento: "1010233625",
    nombreCompleto: "FONTALVO GUTIERREZ BRENDA PATRICIA",
    fechaRetiro: "2026-04-01",
    areaOrigen: "MERCADEO Y COMUNICACIONES",
    cargo: "ASESOR COMERCIAL",
    // Todas OK + generada por TH + cerrada por CI => PAZ_Y_SALVO
    aprobaciones: { ...TODAS_OK },
    fechaLiquidacionGenerada: "2026-04-04T10:00:00.000Z",
    liquidacionGeneradaPor: "Talento Humano",
    fechaLiquidacion: "2026-04-05T15:00:00.000Z",
    liquidadoPor: "Control Interno",
  },
  {
    id: funcId(7),
    documento: "1001788431",
    nombreCompleto: "NATERA RODRIGUEZ DANNA PAOLA",
    fechaRetiro: "2026-04-17",
    areaOrigen: "MERCADEO Y COMUNICACIONES",
    cargo: "ASESOR COMERCIAL",
    fechaLiquidacion: null,
  },
  {
    id: funcId(8),
    documento: "1002343784",
    nombreCompleto: "ORTEGA ESTAN DIEGO ANDRES FELIPE",
    fechaRetiro: "2026-04-17",
    areaOrigen: "MERCADEO Y COMUNICACIONES",
    cargo: "ASESOR COMERCIAL",
    fechaLiquidacion: null,
  },
  {
    id: funcId(9),
    documento: "1129504789",
    nombreCompleto: "SEVERICHE CARRILLO TANIA MARIA",
    fechaRetiro: "2026-04-17",
    areaOrigen: "MERCADEO Y COMUNICACIONES",
    cargo: "ASESOR COMERCIAL",
    fechaLiquidacion: null,
  },
];
