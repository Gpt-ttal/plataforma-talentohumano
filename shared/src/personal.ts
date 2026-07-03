/**
 * personal.ts — Reglas puras del módulo de Administración de Personal (sin I/O).
 *
 * El ciclo de vida de la vinculación NO tiene columna propia: se DERIVA de la
 * misma fila que Paz y Salvo. Así una tabla sostiene dos proyecciones (`Empleado`
 * maestro / `Funcionario` en trámite) sin estado redundante que mantener en sync.
 */

import type { EstadoGlobal, EstadoVinculacion } from "./domain.js";

/**
 * Estado de vinculación derivado de `fechaRetiro` + `estadoGlobal`:
 *  - ACTIVO    ⟺ sin fecha de retiro (empleado vigente, sin trámite).
 *  - EN_RETIRO ⟺ con fecha de retiro y trámite aún abierto.
 *  - RETIRADO  ⟺ trámite cerrado (PAZ_Y_SALVO).
 */
export function estadoVinculacion(e: {
  fechaRetiro: string | null;
  estadoGlobal: EstadoGlobal;
}): EstadoVinculacion {
  if (e.fechaRetiro === null) return "ACTIVO";
  if (e.estadoGlobal === "PAZ_Y_SALVO") return "RETIRADO";
  return "EN_RETIRO";
}

// ── Campos derivados de la hoja de vida 360° ─────────────────────────────────
//
// Edad, antigüedad, grupo etario y rango salarial NO son columnas: se calculan a
// partir de las fechas/valores base para que nunca queden desactualizados. Todas
// las funciones aceptan una fecha de referencia (`hoy`) para ser puras y testeables.

/** Años completos entre `fechaIso` (yyyy-mm-dd) y `hoy`. `null` si falta la fecha. */
export function calcularEdad(
  fechaIso: string | null,
  hoy: Date = new Date(),
): number | null {
  return aniosCumplidos(fechaIso, hoy);
}

/** Años de antigüedad desde `fechaIngreso`. `null` si falta la fecha. */
export function calcularAntiguedad(
  fechaIngreso: string | null,
  hoy: Date = new Date(),
): number | null {
  return aniosCumplidos(fechaIngreso, hoy);
}

/** Grupo etario para reportería agregada. `null` si no hay edad. */
export function grupoEtario(edad: number | null): string | null {
  if (edad === null) return null;
  if (edad < 26) return "18-25";
  if (edad < 36) return "26-35";
  if (edad < 46) return "36-45";
  if (edad < 56) return "46-55";
  return "56+";
}

/** Rango salarial en salarios mínimos (referencia 2026 ≈ $1.423.500). `null` si no aplica. */
export function rangoSalarial(
  salario: number | null,
  smlmv = 1_423_500,
): string | null {
  if (salario === null || salario <= 0) return null;
  const veces = salario / smlmv;
  if (veces < 2) return "1-2 SMMLV";
  if (veces < 4) return "2-4 SMMLV";
  if (veces < 6) return "4-6 SMMLV";
  if (veces < 10) return "6-10 SMMLV";
  return "10+ SMMLV";
}

/** Años completos entre una fecha ISO y `hoy` (helper interno). */
function aniosCumplidos(fechaIso: string | null, hoy: Date): number | null {
  if (!fechaIso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  let edad = hoy.getFullYear() - anio;
  const mesActual = hoy.getMonth() + 1;
  const diaActual = hoy.getDate();
  if (mesActual < mes || (mesActual === mes && diaActual < dia)) edad -= 1;
  return edad < 0 ? null : edad;
}
