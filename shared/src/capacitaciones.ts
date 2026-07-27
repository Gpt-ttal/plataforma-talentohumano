/**
 * capacitaciones.ts — Dominio puro del módulo de Capacitaciones (sin I/O).
 *
 * Una capacitación es un EVENTO (agendamiento: fecha, lugar, instructor, ámbito,
 * horas) con un `token` para el QR. El gestor abre/cierra el registro; el asistente
 * registra su asistencia desde un formulario público (sin login), idempotente por
 * (capacitación × documento). Aquí viven los tipos del dominio y las reglas puras
 * de ámbito/estado/CSV — deterministas, compartidas entre servidor y UI.
 */

import type { RolUsuario } from "./domain.js";
import { formatFechaHora, TIPO_VINCULO_LABEL } from "./ui.js";

/** Ámbito ("dueño") de una capacitación. Mismo motor, visibilidad por ámbito. */
export type AmbitoCapacitacion = "TH" | "SST";

export const AMBITOS_CAPACITACION: readonly AmbitoCapacitacion[] = [
  "TH",
  "SST",
] as const;

/** Estado del registro de asistencia (controlado manualmente por el gestor). */
export type EstadoRegistro = "BORRADOR" | "ABIERTO" | "CERRADO";

export const ESTADOS_REGISTRO: readonly EstadoRegistro[] = [
  "BORRADOR",
  "ABIERTO",
  "CERRADO",
] as const;

/** Tipo de vínculo del asistente con la institución. */
export type TipoVinculo = "PLANTA" | "CONTRATISTA" | "EXTERNO";

export const TIPOS_VINCULO: readonly TipoVinculo[] = [
  "PLANTA",
  "CONTRATISTA",
  "EXTERNO",
] as const;

/** Una capacitación (evento) tal como la ve el gestor. */
export interface Capacitacion {
  id: string;
  titulo: string;
  descripcion: string | null;
  ambito: AmbitoCapacitacion;
  lugar: string | null;
  instructor: string | null;
  iniciaEn: string; // ISO datetime
  terminaEn: string; // ISO datetime
  horas: number | null;
  token: string;
  estadoRegistro: EstadoRegistro;
  creadaPor: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Una asistencia registrada (identidad capturada de forma autónoma). */
export interface Asistencia {
  id: string;
  capacitacionId: string;
  nombre: string;
  documento: string;
  correo: string | null;
  dependencia: string | null;
  tipoVinculo: TipoVinculo;
  usuarioId: string | null;
  registradaEn: string; // ISO datetime
}

/** Detalle de una capacitación: el evento + sus asistencias + el conteo. */
export interface CapacitacionDetalle {
  capacitacion: Capacitacion;
  asistencias: Asistencia[];
  totalAsistencias: number;
}

/**
 * Proyección PÚBLICA de una capacitación: lo que ve quien escanea el QR antes de
 * registrarse. Solo datos no sensibles (sin token, sin asistencias, sin autor).
 */
export interface CapacitacionPublica {
  titulo: string;
  descripcion: string | null;
  lugar: string | null;
  instructor: string | null;
  iniciaEn: string;
  terminaEn: string;
  estadoRegistro: EstadoRegistro;
}

/** Filtro del listado de capacitaciones (búsqueda + ámbito + estado + paginación). */
export interface FiltroCapacitaciones {
  /** Texto libre: título o instructor. */
  q?: string;
  /** Filtro por ámbito (solo el SA elige; TH/SST quedan fijados a su ámbito). */
  ambito?: AmbitoCapacitacion;
  /** Filtro por estado del registro. */
  estado?: EstadoRegistro;
  pagina?: number;
  porPagina?: number;
}

/** Resultado de registrar una asistencia: si se creó o si ya existía (idempotente). */
export interface ResultadoRegistro {
  registrada: boolean;
  yaExistia: boolean;
}

// ── Reglas de ámbito por rol ─────────────────────────────────────────────────

/**
 * Ámbito por defecto al crear una capacitación según el rol del gestor.
 * TH crea de ámbito TH; SST de ámbito SST; el SA no tiene ámbito propio (elige).
 */
export function ambitoPorDefecto(rol: RolUsuario): AmbitoCapacitacion | null {
  if (rol === "TALENTO_HUMANO") return "TH";
  if (rol === "SST") return "SST";
  return null; // SUPERADMIN debe especificarlo
}

/**
 * ¿Puede este rol gestionar (crear/editar/abrir/cerrar) una capacitación del
 * ámbito indicado? El SA gestiona todos; TH solo TH; SST solo SST; el resto no.
 */
export function puedeGestionarAmbito(
  rol: RolUsuario,
  ambito: AmbitoCapacitacion,
): boolean {
  if (rol === "SUPERADMIN") return true;
  if (rol === "TALENTO_HUMANO") return ambito === "TH";
  if (rol === "SST") return ambito === "SST";
  return false;
}

/**
 * Ámbitos que un rol puede VER en el listado. El SA ve ambos; TH y SST solo el
 * suyo; el resto ninguno (no acceden al módulo).
 */
export function ambitosVisibles(rol: RolUsuario): AmbitoCapacitacion[] {
  if (rol === "SUPERADMIN") return ["TH", "SST"];
  if (rol === "TALENTO_HUMANO") return ["TH"];
  if (rol === "SST") return ["SST"];
  return [];
}

/** ¿El registro de asistencia acepta nuevos asistentes ahora mismo? */
export function registroAbierto(estado: EstadoRegistro): boolean {
  return estado === "ABIERTO";
}

/**
 * Canoniza un documento para que la idempotencia por (capacitación × documento)
 * no se pueda eludir con grafías distintas: quita espacios, puntos y guiones y
 * pasa a mayúsculas. Así "1.234.567", "1234567" y "1 234 567" colapsan a una sola
 * fila, y los pasaportes alfanuméricos ("abc-123") se normalizan ("ABC123").
 */
export function normalizarDocumento(doc: string): string {
  return doc.replace(/[\s.\-]/g, "").toUpperCase();
}

// ── Export CSV de asistencias ────────────────────────────────────────────────

const COLUMNAS_CSV = [
  "Nombre",
  "Documento",
  "Correo",
  "Dependencia",
  "Vínculo",
  "Registrada",
] as const;

/** Entrecomilla un campo CSV solo si contiene coma, comilla o salto de línea. */
function escaparCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/**
 * Serializa las asistencias de una capacitación a CSV (encabezado + una fila por
 * asistente), como evidencia descargable. Las fechas-hora se formatean en es-CO.
 * Sin BOM ni dependencias: el servidor solo fija los headers HTTP.
 */
export function construirCsvAsistencias(
  asistencias: readonly Asistencia[],
): string {
  const filas = asistencias.map((a) =>
    [
      a.nombre,
      a.documento,
      a.correo ?? "",
      a.dependencia ?? "",
      TIPO_VINCULO_LABEL[a.tipoVinculo],
      formatFechaHora(a.registradaEn),
    ].map((c) => escaparCsv(c)),
  );

  const lineas = [COLUMNAS_CSV.join(","), ...filas.map((f) => f.join(","))];
  return lineas.join("\n");
}
