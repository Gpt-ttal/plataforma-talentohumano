/**
 * archivo.ts — Lógica pura del Archivo institucional (sin I/O).
 *
 * El Archivo es una vista de SOLO LECTURA sobre los funcionarios ya finalizados
 * (estado terminal `PAZ_Y_SALVO`): no introduce tablas nuevas. Aquí viven el
 * filtro tipado de su listado, el cálculo de "días de trámite" y la serialización
 * CSV del export — todo determinista para poder probarlo en aislamiento y
 * compartirlo entre el servidor (export con auth) y la UI.
 */

import type { Funcionario } from "./domain.js";
import { formatFechaHora } from "./ui.js";

const DIA = 24 * 60 * 60 * 1000;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Filtro del listado del Archivo. El estado siempre es `PAZ_Y_SALVO` (implícito),
 * así que solo se parametrizan búsqueda, rango de fecha de retiro y paginación.
 */
export interface FiltroArchivo {
  /** Texto libre: nombre o documento. */
  q?: string;
  /** Límite inferior (inclusive) de la fecha de retiro, "yyyy-mm-dd". */
  retiroDesde?: string;
  /** Límite superior (inclusive) de la fecha de retiro, "yyyy-mm-dd". */
  retiroHasta?: string;
  pagina?: number;
  porPagina?: number;
}

/**
 * Días completos de trámite: desde la fecha de retiro del funcionario hasta el
 * cierre (paz y salvo). Mide la duración institucional real del proceso de
 * desvinculación. Devuelve `null` si el trámite no está cerrado o si alguna fecha
 * es inválida (no se inventa un cero engañoso).
 */
export function diasDeTramite(
  fechaRetiro: string | null | undefined,
  fechaLiquidacion: string | null | undefined,
): number | null {
  if (!fechaRetiro || !fechaLiquidacion) return null;
  const tR = Date.parse(
    fechaRetiro.length <= 10 ? `${fechaRetiro}T00:00:00.000Z` : fechaRetiro,
  );
  const tL = Date.parse(fechaLiquidacion);
  if (Number.isNaN(tR) || Number.isNaN(tL)) return null;
  return Math.floor((tL - tR) / DIA);
}

/** Normaliza los `searchParams` crudos del Archivo a un `FiltroArchivo`. */
export function parseFiltroArchivo(raw: {
  q?: string;
  retiroDesde?: string;
  retiroHasta?: string;
  pagina?: string;
}): FiltroArchivo {
  const q = raw.q?.trim() || undefined;
  const retiroDesde = RE_FECHA.test(raw.retiroDesde ?? "")
    ? raw.retiroDesde
    : undefined;
  const retiroHasta = RE_FECHA.test(raw.retiroHasta ?? "")
    ? raw.retiroHasta
    : undefined;
  const paginaNum = Number.parseInt(raw.pagina ?? "", 10);
  const pagina = Number.isFinite(paginaNum) && paginaNum >= 1 ? paginaNum : 1;
  return { q, retiroDesde, retiroHasta, pagina };
}

// ── Export CSV ───────────────────────────────────────────────────────────────

const COLUMNAS_CSV = [
  "Documento",
  "Nombre completo",
  "Cargo",
  "Área de origen",
  "Fecha de retiro",
  "Liquidación generada",
  "Generada por",
  "Paz y salvo",
  "Cerrado por",
  "Días de trámite",
] as const;

/** Entrecomilla un campo CSV solo si contiene coma, comilla o salto de línea. */
function escaparCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Serializa el listado filtrado del Archivo a CSV (encabezado + una fila por
 * funcionario). Las fechas-hora se formatean en es-CO; los días de trámite van
 * vacíos si el trámite no está cerrado. Sin BOM ni dependencias: el servidor solo
 * fija los headers HTTP.
 */
export function construirCsvArchivo(
  funcionarios: readonly Funcionario[],
): string {
  const filas = funcionarios.map((f) => {
    const dias = diasDeTramite(f.fechaRetiro, f.fechaLiquidacion);
    return [
      f.documento,
      f.nombreCompleto,
      f.cargo,
      f.areaOrigen,
      f.fechaRetiro,
      f.fechaLiquidacionGenerada ? formatFechaHora(f.fechaLiquidacionGenerada) : "",
      f.liquidacionGeneradaPor ?? "",
      f.fechaLiquidacion ? formatFechaHora(f.fechaLiquidacion) : "",
      f.liquidadoPor ?? "",
      dias === null ? "" : String(dias),
    ].map((c) => escaparCsv(c));
  });

  const lineas = [COLUMNAS_CSV.join(","), ...filas.map((f) => f.join(","))];
  return lineas.join("\n");
}
