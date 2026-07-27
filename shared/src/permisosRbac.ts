/**
 * permisosRbac.ts — Dominio puro del RBAC editable (permisos rol × módulo).
 *
 * Principio: `requireRol`/`exigirRol` + el enum de roles son el PISO de seguridad
 * inamovible. La matriz de permisos solo **resta** visibilidad/acceso sobre ese
 * piso, nunca otorga más de lo que el rol ya podría. `MODULOS` sigue siendo el
 * catálogo declarativo y la fuente del seed/fallback.
 *
 * Sin I/O: la resolución desde BD vive en el backend; aquí solo tipos y funciones
 * puras (niveles, defaults, completitud del seed, visibilidad).
 */

import type { RolUsuario } from "./domain.js";
import { ROLES_USUARIO } from "./domain.js";
import { MODULOS } from "./modulos.js";

/** Nivel de acceso de un rol sobre un módulo, en orden ascendente de privilegio. */
export type NivelPermiso = "NINGUNO" | "LECTURA" | "ESCRITURA" | "ADMIN";

export const NIVELES_PERMISO: readonly NivelPermiso[] = [
  "NINGUNO",
  "LECTURA",
  "ESCRITURA",
  "ADMIN",
] as const;

/** Peso numérico de cada nivel para comparar suficiencia. */
export const ORDEN_NIVEL: Record<NivelPermiso, number> = {
  NINGUNO: 0,
  LECTURA: 1,
  ESCRITURA: 2,
  ADMIN: 3,
};

/** Una celda de la matriz: qué nivel tiene un rol sobre un módulo. */
export interface CeldaPermiso {
  rol: RolUsuario;
  moduloId: string;
  nivel: NivelPermiso;
}

/**
 * ¿El nivel `actual` alcanza el `requerido`? Comparación por peso. Se reutiliza en
 * el middleware (`requirePermiso`), los casos de uso y la UI para no duplicar la
 * regla de suficiencia.
 */
export function nivelSuficiente(
  actual: NivelPermiso,
  requerido: NivelPermiso,
): boolean {
  return ORDEN_NIVEL[actual] >= ORDEN_NIVEL[requerido];
}

/**
 * Nivel por defecto de un rol sobre un módulo, derivado de `MODULOS.rolesQueVen`:
 *  - módulo no visible para el rol → NINGUNO;
 *  - visible y rol SUPERADMIN → ADMIN (gobierna todo);
 *  - visible y cualquier otro rol → ESCRITURA (opera el módulo).
 * Es el seed inicial de la tabla y el fallback si la matriz no está en BD.
 */
export function nivelPorDefecto(rol: RolUsuario, moduloId: string): NivelPermiso {
  const modulo = MODULOS.find((m) => m.id === moduloId);
  if (!modulo || !modulo.rolesQueVen.includes(rol)) return "NINGUNO";
  return rol === "SUPERADMIN" ? "ADMIN" : "ESCRITURA";
}

/**
 * Matriz completa por defecto (todos los roles × todos los módulos), derivada de
 * `MODULOS`. Semilla de la migración 0023 y fallback del loader del backend.
 */
export function permisosSeedPorDefecto(): CeldaPermiso[] {
  const celdas: CeldaPermiso[] = [];
  for (const rol of ROLES_USUARIO) {
    for (const modulo of MODULOS) {
      celdas.push({ rol, moduloId: modulo.id, nivel: nivelPorDefecto(rol, modulo.id) });
    }
  }
  return celdas;
}

/**
 * IDs de los módulos que un rol puede VER según la matriz (nivel ≥ LECTURA), en el
 * orden declarado en `MODULOS`. La matriz solo filtra sobre lo que existe en
 * `MODULOS`; nunca agrega módulos inexistentes.
 */
export function modulosVisiblesDesdeMatriz(
  celdas: CeldaPermiso[],
  rol: RolUsuario,
): string[] {
  const nivelPorModulo = new Map<string, NivelPermiso>();
  for (const c of celdas) {
    if (c.rol === rol) nivelPorModulo.set(c.moduloId, c.nivel);
  }
  return MODULOS.filter((m) => {
    const nivel = nivelPorModulo.get(m.id) ?? nivelPorDefecto(rol, m.id);
    return nivelSuficiente(nivel, "LECTURA");
  }).map((m) => m.id);
}
