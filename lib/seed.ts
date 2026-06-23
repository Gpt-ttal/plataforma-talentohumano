/**
 * seed.ts — Datos semilla (fuente única de verdad).
 * Usado por el store en memoria (demo) y reflejado en supabase/seed.sql (prod).
 *
 * - 10 áreas de visto bueno (del sistema original).
 * - 9 funcionarios reales tomados del Excel base.
 * - Variedad realista en las aprobaciones para que la demo muestre los 3 estados
 *   y un dashboard con datos significativos.
 */

import type { AreaVistoBueno, EstadoArea } from "./domain";

/** IDs deterministas para que el store en memoria y Supabase coincidan. */
const areaId = (n: number) =>
  `a0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const funcId = (n: number) =>
  `f0000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

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
  fechaLiquidacion: string | null;
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
    fechaLiquidacion: "2026-04-05T15:00:00.000Z",
    // Todas OK + liquidado => PAZ_Y_SALVO
    aprobaciones: { ...TODAS_OK },
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
