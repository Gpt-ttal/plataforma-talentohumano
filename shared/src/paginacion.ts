/**
 * paginacion.ts — Paginación pura en memoria (sin I/O).
 *
 * El repo en memoria la usa para servir páginas; el repo de Supabase pagina en la
 * base con `.range()`. Acota la página a un rango válido para que la UI nunca pida
 * una página inexistente.
 */

import type { Pagina, ResultadoPaginado } from "./domain.js";

/** Tamaño de página por defecto del catálogo. */
export const POR_PAGINA_DEFECTO = 10;

/** Normaliza los parámetros de página: enteros >= 1. */
export function normalizarPagina(p: Partial<Pagina> | undefined): Pagina {
  const porPagina = Math.max(1, Math.floor(p?.porPagina ?? POR_PAGINA_DEFECTO));
  const pagina = Math.max(1, Math.floor(p?.pagina ?? 1));
  return { pagina, porPagina };
}

/**
 * Pagina una lista ya ordenada/filtrada. Acota `pagina` a [1, totalPaginas] para
 * que una página fuera de rango devuelva la última válida en vez de vacío.
 */
export function paginar<T>(
  items: readonly T[],
  pagina: Partial<Pagina> | undefined,
): ResultadoPaginado<T> {
  const { porPagina } = normalizarPagina(pagina);
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaAcotada = Math.min(normalizarPagina(pagina).pagina, totalPaginas);
  const inicio = (paginaAcotada - 1) * porPagina;
  return {
    items: items.slice(inicio, inicio + porPagina),
    total,
    pagina: paginaAcotada,
    porPagina,
    totalPaginas,
  };
}
