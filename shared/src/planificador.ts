/**
 * planificador.ts — Dominio puro del submódulo Planificador (sin I/O).
 *
 * Una capacitación planeada es un ítem simple de agenda anual (título, área
 * objetivo en texto libre, par año/mes, estado, notas) sin vínculo automático a
 * Eventos ni a Cursos todavía. Reutiliza `AmbitoCapacitacion` de
 * `capacitaciones.ts` — mismo motor de ámbito, sin duplicarlo.
 */

import type { AmbitoCapacitacion } from "./capacitaciones.js";

/** Estado de una capacitación planeada (ciclo de vida simple, sin QR/asistencia). */
export type EstadoCapacitacionPlaneada = "PLANEADA" | "EN_CURSO" | "COMPLETADA";

export const ESTADOS_CAPACITACION_PLANEADA: readonly EstadoCapacitacionPlaneada[] =
  ["PLANEADA", "EN_CURSO", "COMPLETADA"] as const;

/**
 * Un ítem del plan institucional de capacitaciones para un mes/año dado.
 * `areaObjetivo` es texto libre (NO FK a `areas`: esa tabla es exclusiva del
 * flujo de aprobación de Paz y Salvo, no un directorio general).
 */
export interface CapacitacionPlaneada {
  id: string;
  titulo: string;
  areaObjetivo: string | null;
  ambito: AmbitoCapacitacion;
  anio: number;
  mes: number;
  estado: EstadoCapacitacionPlaneada;
  notas: string | null;
  creadaPor: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Filtro del listado del planificador (búsqueda + ámbito + estado + año/mes + paginación). */
export interface FiltroCapacitacionesPlaneadas {
  /** Texto libre: título. */
  q?: string;
  ambito?: AmbitoCapacitacion;
  estado?: EstadoCapacitacionPlaneada;
  anio?: number;
  mes?: number;
  pagina?: number;
  porPagina?: number;
}

/**
 * Trimestre calendario de un mes (1–12). Solo para presentación (chip de
 * filtro derivado) — el trimestre NUNCA se almacena, siempre se deriva del par
 * (año, mes). Zod es dueño de validar que `mes` esté en rango; esta función
 * asume un valor ya válido.
 */
export function trimestreDe(mes: number): 1 | 2 | 3 | 4 {
  return Math.ceil(mes / 3) as 1 | 2 | 3 | 4;
}
