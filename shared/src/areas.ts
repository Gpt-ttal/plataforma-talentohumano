/**
 * areas.ts — Reglas puras del catálogo de áreas (sin I/O).
 *
 * El cálculo de estado vive en `estado.ts` (intocable); aquí solo decidimos QUÉ
 * áreas alimentan ese cálculo y cómo entra una dependencia nueva al catálogo.
 */

import type { AreaVistoBueno, EstadoArea, EstadoGlobal } from "./domain.js";

/**
 * D1 — Estado inicial de la aprobación de un área recién creada, por funcionario.
 *
 * Un trámite ya cerrado (`PAZ_Y_SALVO`) no se reabre: la dependencia nueva entra
 * como `NO_APLICA` (cuenta como OK, no bloquea). Cualquier otro trámite sigue en
 * proceso, así que la nueva área entra como `PENDIENTE` (debe gestionarse).
 */
export function estadoInicialAreaNueva(estadoGlobal: EstadoGlobal): EstadoArea {
  return estadoGlobal === "PAZ_Y_SALVO" ? "NO_APLICA" : "PENDIENTE";
}

/**
 * D2 — Solo las áreas activas participan del cálculo de estado, de las colas y de
 * la matriz. Una dependencia inactiva deja de exigirse (sale del conjunto).
 */
export function soloActivas(areas: readonly AreaVistoBueno[]): AreaVistoBueno[] {
  return areas.filter((a) => a.activa);
}
