/**
 * cola.ts — Lógica pura de la cola de trabajo de un área: corte por bucket
 * (lo que falta gestionar vs. lo ya gestionado) y contadores. La usa el repo
 * del backend (filtra en memoria sobre la cola del área, ya acotada) y deja los
 * contadores listos para los chips del frontend.
 */

import type {
  BucketGestion,
  ColaGestionArea,
  EstadoArea,
  FilaGestionArea,
  FiltroGestionArea,
} from "./domain.js";
import { paginar } from "./paginacion.js";

/** Un área deja de estar "por gestionar" en cuanto su estado no es PENDIENTE. */
export function esGestionado(estado: EstadoArea): boolean {
  return estado !== "PENDIENTE";
}

/**
 * Filtra la cola completa de un área por bucket y la pagina, devolviendo además
 * los contadores de cada bucket sobre el total del área (independientes de la
 * página seleccionada).
 */
export function particionarCola(
  filas: readonly FilaGestionArea[],
  filtro?: FiltroGestionArea,
): ColaGestionArea {
  const pendientes = filas.filter((f) => !esGestionado(f.estado));
  const gestionados = filas.filter((f) => esGestionado(f.estado));
  const conteos = {
    pendientes: pendientes.length,
    gestionados: gestionados.length,
    total: filas.length,
  };

  const bucket: BucketGestion = filtro?.bucket ?? "todos";
  const seleccion =
    bucket === "pendientes"
      ? pendientes
      : bucket === "gestionados"
        ? gestionados
        : filas;

  return { ...paginar(seleccion, filtro), conteos };
}
