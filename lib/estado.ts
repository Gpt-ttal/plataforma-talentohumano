/**
 * estado.ts — Máquina de estados del Paz y Salvo (función pura, sin I/O).
 *
 *   todas las áreas OK  &&  liquidado    -> PAZ_Y_SALVO
 *   todas las áreas OK  && !liquidado    -> LISTO_PARA_LIQUIDAR
 *   en otro caso (o sin áreas)           -> PENDIENTE
 *
 * "OK" = APROBADO o NO_APLICA. Un NO_APROBADO marca `hayRechazo` para la UI.
 */

import type { EstadoArea, EstadoGlobal } from "./domain";

export interface EntradaEstado {
  estadosAreas: EstadoArea[];
  liquidado: boolean;
}

export interface ResultadoEstado {
  estadoGlobal: EstadoGlobal;
  hayRechazo: boolean;
}

function esOk(estado: EstadoArea): boolean {
  return estado === "APROBADO" || estado === "NO_APLICA";
}

export function calcularEstadoGlobal(entrada: EntradaEstado): ResultadoEstado {
  const { estadosAreas, liquidado } = entrada;

  const hayRechazo = estadosAreas.some((e) => e === "NO_APROBADO");

  // Sin áreas que evaluar no se puede liberar a nadie.
  if (estadosAreas.length === 0) {
    return { estadoGlobal: "PENDIENTE", hayRechazo };
  }

  const todasOk = estadosAreas.every(esOk);

  if (!todasOk) {
    return { estadoGlobal: "PENDIENTE", hayRechazo };
  }

  return {
    estadoGlobal: liquidado ? "PAZ_Y_SALVO" : "LISTO_PARA_LIQUIDAR",
    hayRechazo,
  };
}
