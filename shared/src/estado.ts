/**
 * estado.ts — Máquina de estados del Paz y Salvo (función pura, sin I/O).
 *
 *   todas OK && liquidado            -> PAZ_Y_SALVO          (CI cerró)
 *   todas OK && liquidacionGenerada  -> LIQUIDACION_GENERADA (TH generó y avisó)
 *   todas OK                         -> LISTO_PARA_LIQUIDAR
 *   en otro caso (o sin áreas)       -> PENDIENTE
 *
 * "OK" = APROBADO o NO_APLICA. Un NO_APROBADO marca `hayRechazo` para la UI.
 *
 * Integridad: si las áreas NO están todas OK, el estado es PENDIENTE sin importar
 * los flags de generación/cierre. Quien persiste (el repo) debe además limpiar esos
 * hitos cuando un área regresa, para que el flujo TH → CI se reinicie limpio.
 */

import type { EstadoArea, EstadoGlobal } from "./domain.js";

export interface EntradaEstado {
  estadosAreas: EstadoArea[];
  /** Talento Humano ya generó la liquidación (avisó a Control Interno). */
  liquidacionGenerada: boolean;
  /** Control Interno ya cerró: el funcionario quedó a paz y salvo. */
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
  const { estadosAreas, liquidacionGenerada, liquidado } = entrada;

  const hayRechazo = estadosAreas.some((e) => e === "NO_APROBADO");

  // Sin áreas que evaluar no se puede liberar a nadie.
  if (estadosAreas.length === 0) {
    return { estadoGlobal: "PENDIENTE", hayRechazo };
  }

  const todasOk = estadosAreas.every(esOk);

  if (!todasOk) {
    return { estadoGlobal: "PENDIENTE", hayRechazo };
  }

  if (liquidado) {
    return { estadoGlobal: "PAZ_Y_SALVO", hayRechazo };
  }

  if (liquidacionGenerada) {
    return { estadoGlobal: "LIQUIDACION_GENERADA", hayRechazo };
  }

  return { estadoGlobal: "LISTO_PARA_LIQUIDAR", hayRechazo };
}
