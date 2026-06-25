/**
 * catalogo.ts — Lógica pura del catálogo paginado (sin I/O).
 *
 * Traduce los `searchParams` crudos a un filtro tipado y construye las URLs de
 * navegación (paginación, chips, búsqueda) de forma determinista. Al ser puro se
 * prueba en aislamiento y lo comparten la página y los componentes de navegación.
 */

import { ESTADOS_GLOBAL } from "./domain.js";
import type { EstadoGlobal, FiltroFuncionarios } from "./domain.js";

/**
 * Construye `basePath?clave=valor&…` a partir de un mapa, omitiendo valores
 * vacíos/`undefined`/`null` y recortando los strings. Mantiene el orden de
 * inserción para hrefs estables (útil para tests y para el diff de Next).
 */
export function hrefCon(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const sp = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null) continue;
    const s = String(valor).trim();
    if (s) sp.set(clave, s);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Type guard: ¿es `v` un `EstadoGlobal` válido del dominio? */
export function esEstadoGlobal(
  v: string | undefined | null,
): v is EstadoGlobal {
  return v != null && (ESTADOS_GLOBAL as readonly string[]).includes(v);
}

/**
 * Normaliza los `searchParams` crudos del catálogo a un `FiltroFuncionarios`:
 *  - `q`: recortado; vacío → `undefined`.
 *  - `estado`: solo si es un `EstadoGlobal` válido (basura → `undefined`).
 *  - `pagina`: entero >= 1 (default 1).
 */
export function parseFiltroFuncionarios(raw: {
  q?: string;
  estado?: string;
  pagina?: string;
}): FiltroFuncionarios {
  const q = raw.q?.trim() || undefined;
  const estado = esEstadoGlobal(raw.estado) ? raw.estado : undefined;
  const paginaNum = Number.parseInt(raw.pagina ?? "", 10);
  const pagina = Number.isFinite(paginaNum) && paginaNum >= 1 ? paginaNum : 1;
  return { q, estado, pagina };
}
