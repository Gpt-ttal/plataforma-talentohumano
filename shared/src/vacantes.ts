/**
 * vacantes.ts — Dominio puro del módulo de Vacantes (sin I/O).
 *
 * Adaptación del backend original (Google Apps Script + Sheets, sistema
 * "seguimiento-vacantes-v1") a la plataforma: mismas reglas de negocio
 * (vencimiento EDATE, validación de dos niveles BLOQUEO/AVISO, 7 KPIs + 6
 * series del dashboard), refinadas para persistencia relacional.
 *
 * Refinamientos sobre el v1:
 *  - Los catálogos descriptivos (modalidad, dedicación, escalafón, motivo,
 *    fuente) se referencian por su `clave` canónica (UPPER_SNAKE), resuelta
 *    por el repo desde tablas con FK — no hace falta `Dominio.Vocabulario`
 *    para comparar textos con distinta caja/tilde, el dato ya llega canónico.
 *  - `STATUS`, `DÍAS PARA VENCER`, `DÍAS EN PROCESO` y las observaciones NUNCA
 *    se persisten: se derivan en cada lectura vía `derivarVacante`/`evaluarFila`
 *    (coherente con el resto de la plataforma — ver ADR-0005).
 */

import type { TipoVinculacion } from "./domain.js";

// ── Catálogos con llave (FK) ─────────────────────────────────────────────────

/** Ítem de un catálogo de vacantes (modalidad/dedicación/escalafón/motivo/fuente). */
export interface CatalogoVacanteItem {
  id: string;
  clave: string;
  nombre: string;
  activo: boolean;
  orden: number;
}

/** Clave canónica de la dedicación "Administrativo" (usada por `evaluarFila`). */
export const DEDICACION_ADMINISTRATIVO_CLAVE = "ADMINISTRATIVO";

// ── Máquina de estados (se quedan como enums: la lógica los recorre exhaustivamente) ──

export type EstadoVacante =
  | "PENDIENTE"
  | "CONTRATADO"
  | "CANCELADA"
  | "CERRADA_PROMOCION"
  | "PAUSADA";

export const ESTADOS_VACANTE: readonly EstadoVacante[] = [
  "PENDIENTE",
  "CONTRATADO",
  "CANCELADA",
  "CERRADA_PROMOCION",
  "PAUSADA",
] as const;

/** Estados que cierran el proceso sin cubrir la vacante (STATUS derivado = CERRADA). */
export const ESTADOS_VACANTE_CERRADOS: readonly EstadoVacante[] = [
  "CANCELADA",
  "CERRADA_PROMOCION",
  "PAUSADA",
];

export type FaseVacante =
  | "RECLUTAMIENTO"
  | "APROBACION_VICERRECTORIA"
  | "PRUEBAS_IDONEIDAD"
  | "PRUEBAS_PSICOTECNICAS"
  | "EXAMEN_MEDICO"
  | "POLIGRAFIA"
  | "CONTRATACION";

export const FASES_VACANTE: readonly FaseVacante[] = [
  "RECLUTAMIENTO",
  "APROBACION_VICERRECTORIA",
  "PRUEBAS_IDONEIDAD",
  "PRUEBAS_PSICOTECNICAS",
  "EXAMEN_MEDICO",
  "POLIGRAFIA",
  "CONTRATACION",
] as const;

/** Fases donde ya debería haber presupuesto aprobado. */
export const FASES_VACANTE_AVANZADAS: readonly FaseVacante[] = [
  "PRUEBAS_IDONEIDAD",
  "PRUEBAS_PSICOTECNICAS",
  "EXAMEN_MEDICO",
  "POLIGRAFIA",
  "CONTRATACION",
];

export const FASE_VACANTE_INICIAL: FaseVacante = "RECLUTAMIENTO";

export type AprobacionPresupuestoVacante =
  | "SOLICITADO"
  | "EN_REVISION"
  | "APROBADO"
  | "NO_APROBADO";

export const APROBACIONES_PRESUPUESTO_VACANTE: readonly AprobacionPresupuestoVacante[] = [
  "SOLICITADO",
  "EN_REVISION",
  "APROBADO",
  "NO_APROBADO",
] as const;

/** STATUS derivado (nunca almacenado): null cuando no hay fecha de requerimiento. */
export type StatusVacante = "VIGENTE" | "VENCIDA" | "CUBIERTA" | "CERRADA";

// ── Reglas parametrizables (espejo de CONFIG.REGLAS del v1) ─────────────────

export const MESES_VIGENCIA_VACANTE = 1;
export const CEDULA_MIN_DIGITOS = 6;
export const CEDULA_MAX_DIGITOS = 10;
export const POSICIONES_MINIMO = 1;
export const DIAS_ALERTA_VENCIDA_SIN_AVANCE = 5;

// ── Modelo de datos (solo campos capturados; ver nota de cabecera) ──────────

export interface Vacante {
  id: string;
  /** N.º de requerimiento, secuencia legible autogenerada. */
  requerimiento: string | null;
  cargo: string;
  posiciones: number;
  areaId: string | null;
  /** Clave del catálogo `vacante_modalidades` (o null si no se ha definido). */
  modalidad: string | null;
  /** Clave del catálogo `vacante_dedicaciones`. */
  dedicacion: string | null;
  /** Clave del catálogo `vacante_escalafones`. */
  escalafon: string | null;
  /** Clave del catálogo `vacante_motivos`. */
  motivo: string | null;
  /** Clave del catálogo `vacante_fuentes`. */
  fuente: string | null;
  jefe: string | null;
  reemplazo: string | null;
  nombreNuevo: string | null;
  salario: number | null;
  aprobacion: AprobacionPresupuestoVacante | null;
  fechaAprobacion: string | null; // ISO date
  fechaRequerimiento: string; // ISO date
  fase: FaseVacante;
  estado: EstadoVacante;
  fechaContratacion: string | null; // ISO date
  cedula: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Severidad de un hallazgo de validación: BLOQUEO revierte, AVISO marca y deja pasar. */
export type SeveridadHallazgoVacante = "BLOQUEO" | "AVISO";

export interface HallazgoVacante {
  campo: string;
  severidad: SeveridadHallazgoVacante;
  mensaje: string;
}

/** Vacante + sus campos derivados (recalculados en cada lectura, nunca persistidos). */
export interface VacanteDerivada extends Vacante {
  fechaVencimiento: string | null; // ISO date
  diasParaVencer: number | null;
  diasEnProceso: number | null;
  status: StatusVacante | null;
  /** Solo los hallazgos de severidad AVISO (los BLOQUEO nunca llegan a persistir). */
  avisos: HallazgoVacante[];
}

/**
 * Subconjunto de `Vacante` que necesita `evaluarFila`: todo salvo identidad y
 * auditoría. Permite validar un borrador ANTES de insertarlo (aún sin `id`).
 */
export type VacanteEvaluable = Omit<Vacante, "id" | "createdAt" | "updatedAt">;

/** Filtro del catálogo de vacantes (búsqueda + estado + área + paginación). */
export interface FiltroVacantes {
  q?: string;
  estado?: EstadoVacante;
  areaId?: string;
  pagina?: number;
  porPagina?: number;
}

/** Sugerencias de autocompletar a partir de vacantes existentes (por cargo/área). */
export interface SugerenciasVacante {
  jefe?: string;
  dedicacion?: string;
  modalidad?: string;
}

// ── Cálculo temporal (semántica EDATE: sumarMeses fija fin de mes) ──────────

const MS_DIA = 24 * 60 * 60 * 1000;

function parseFechaLocal(fechaIso: string): Date {
  const [anio, mes, dia] = fechaIso.split("-").map(Number);
  return new Date(anio!, (mes ?? 1) - 1, dia ?? 1);
}

function formatFechaIso(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/**
 * Suma N meses calendario a una fecha ISO, con semántica EDATE (fija fin de
 * mes). Ej: 2026-06-10 +1 -> 2026-07-10 ; 2026-01-31 +1 -> 2026-02-28.
 */
export function sumarMesesFecha(fechaIso: string, meses: number): string {
  const fecha = parseFechaLocal(fechaIso);
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const dia = fecha.getDate();
  const destino = new Date(anio, mes + meses, 1);
  const ultimoDiaDestino = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(dia, ultimoDiaDestino));
  return formatFechaIso(destino);
}

/** Diferencia en días completos entre dos fechas ISO (b - a). */
export function diasEntreFechas(aIso: string, bIso: string): number {
  const a = parseFechaLocal(aIso);
  const b = parseFechaLocal(bIso);
  const na = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const nb = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((nb - na) / MS_DIA);
}

/** Fecha de vencimiento = fecha de requerimiento + `MESES_VIGENCIA_VACANTE`. */
export function calcularVencimientoVacante(fechaRequerimiento: string): string {
  return sumarMesesFecha(fechaRequerimiento, MESES_VIGENCIA_VACANTE);
}

/**
 * Días para vencer respecto a `hoy`. > 0 quedan N días, = 0 vence hoy,
 * < 0 venció hace N días. `null` si no aplica (ya contratada).
 */
export function diasParaVencerVacante(
  fechaVencimiento: string,
  estado: EstadoVacante,
  hoyIso: string,
): number | null {
  if (estado === "CONTRATADO") return null;
  return diasEntreFechas(hoyIso, fechaVencimiento);
}

/**
 * STATUS de la vacante:
 *   CONTRATADO                         -> CUBIERTA
 *   CANCELADA/CERRADA_PROMOCION/PAUSADA -> CERRADA
 *   hoy > vencimiento                  -> VENCIDA
 *   en otro caso                       -> VIGENTE
 */
export function calcularStatusVacante(
  estado: EstadoVacante,
  fechaVencimiento: string | null,
  hoyIso: string,
): StatusVacante | null {
  if (estado === "CONTRATADO") return "CUBIERTA";
  if (ESTADOS_VACANTE_CERRADOS.includes(estado)) return "CERRADA";
  if (!fechaVencimiento) return null;
  return diasEntreFechas(hoyIso, fechaVencimiento) < 0 ? "VENCIDA" : "VIGENTE";
}

/**
 * Días en proceso: de la fecha de requerimiento a la de contratación (si ya
 * ingresó) o a `hoy` (si sigue en curso).
 */
export function diasEnProcesoVacante(
  fechaRequerimiento: string,
  fechaContratacion: string | null,
  hoyIso: string,
): number {
  const fin = fechaContratacion ?? hoyIso;
  return diasEntreFechas(fechaRequerimiento, fin);
}

// ── Validación de dos niveles (BLOQUEO / AVISO) ──────────────────────────────

function vacioTexto(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === "";
}

/** ¿Cédula válida? Numérica y dentro del rango de dígitos permitido. */
export function esCedulaValida(cedula: string): boolean {
  const digitos = cedula.replace(/[^\d]/g, "");
  return digitos.length >= CEDULA_MIN_DIGITOS && digitos.length <= CEDULA_MAX_DIGITOS;
}

/**
 * Evalúa una vacante y devuelve todos sus hallazgos (BLOQUEO + AVISO). Puerto
 * fiel de `Dominio.Validacion.evaluarFila` del v1: casi nada es BLOQUEO salvo
 * con `estado=CONTRATADO`, cédula mal formada o posiciones inválidas — la
 * validación del cliente nunca debe ser más estricta que esta.
 */
export function evaluarFila(v: VacanteEvaluable, hoyIso: string): HallazgoVacante[] {
  const out: HallazgoVacante[] = [];
  const esContratado = v.estado === "CONTRATADO";

  // ---- BLOQUEOS (incoherencias críticas) ------------------------------------
  if (esContratado && vacioTexto(v.cedula)) {
    out.push({ campo: "cedula", severidad: "BLOQUEO", mensaje: 'No puede marcar "Contratado" sin cédula.' });
  }
  if (esContratado && vacioTexto(v.nombreNuevo)) {
    out.push({
      campo: "nombreNuevo",
      severidad: "BLOQUEO",
      mensaje: 'No puede marcar "Contratado" sin el nombre del nuevo empleado.',
    });
  }
  if (esContratado && !v.fechaContratacion) {
    out.push({
      campo: "fechaContratacion",
      severidad: "BLOQUEO",
      mensaje: 'No puede marcar "Contratado" sin fecha de contratación válida.',
    });
  }
  if (!vacioTexto(v.cedula) && !esCedulaValida(v.cedula!)) {
    out.push({
      campo: "cedula",
      severidad: "BLOQUEO",
      mensaje: `Cédula inválida: debe ser numérica de ${CEDULA_MIN_DIGITOS} a ${CEDULA_MAX_DIGITOS} dígitos.`,
    });
  }
  if (
    v.fechaContratacion &&
    v.fechaRequerimiento &&
    diasEntreFechas(v.fechaRequerimiento, v.fechaContratacion) < 0
  ) {
    out.push({
      campo: "fechaContratacion",
      severidad: "BLOQUEO",
      mensaje: "La fecha de contratación no puede ser anterior a la de requerimiento.",
    });
  }
  if (!Number.isInteger(v.posiciones) || v.posiciones < POSICIONES_MINIMO) {
    out.push({
      campo: "posiciones",
      severidad: "BLOQUEO",
      mensaje: `N.º de posiciones debe ser un entero ≥ ${POSICIONES_MINIMO}.`,
    });
  }
  // Al contratar se crea el funcionario (ADR-0009) y su `area_origen` (NOT NULL)
  // se copia del área de la vacante: sin área no hay a dónde ingresar a la persona.
  if (esContratado && vacioTexto(v.areaId)) {
    out.push({
      campo: "areaId",
      severidad: "BLOQUEO",
      mensaje: 'No puede marcar "Contratado" sin área.',
    });
  }

  // ---- AVISOS (revisables, no bloquean) -------------------------------------
  if (v.estado === "PENDIENTE" && v.fechaContratacion) {
    out.push({
      campo: "fechaContratacion",
      severidad: "AVISO",
      mensaje: 'Una vacante "Pendiente" no debería tener fecha de contratación.',
    });
  }
  if (v.salario === null && v.dedicacion === DEDICACION_ADMINISTRATIVO_CLAVE) {
    out.push({ campo: "salario", severidad: "AVISO", mensaje: "Cargo administrativo sin salario registrado." });
  }
  if (FASES_VACANTE_AVANZADAS.includes(v.fase) && v.aprobacion !== "APROBADO") {
    out.push({
      campo: "aprobacion",
      severidad: "AVISO",
      mensaje: `Fase avanzada (${v.fase}) con presupuesto no aprobado.`,
    });
  }
  // Cuando ya es CONTRATADO, la falta de área es BLOQUEO (arriba), no AVISO.
  if (!esContratado && !v.areaId) {
    out.push({ campo: "areaId", severidad: "AVISO", mensaje: "Falta el área / programa." });
  }
  if (vacioTexto(v.jefe)) {
    out.push({ campo: "jefe", severidad: "AVISO", mensaje: "Falta el jefe inmediato." });
  }

  // Vencida sin avance: sigue en Reclutamiento y venció hace más del umbral.
  if (!esContratado && v.fechaRequerimiento) {
    const venc = calcularVencimientoVacante(v.fechaRequerimiento);
    const status = calcularStatusVacante(v.estado, venc, hoyIso);
    if (status === "VENCIDA" && v.fase === FASE_VACANTE_INICIAL) {
      const dias = -diasEntreFechas(hoyIso, venc);
      if (dias >= DIAS_ALERTA_VENCIDA_SIN_AVANCE) {
        out.push({ campo: "status", severidad: "AVISO", mensaje: `Vencida hace ${dias} días y aún en Reclutamiento.` });
      }
    }
  }

  return out;
}

/** ¿La lista de hallazgos contiene al menos un BLOQUEO? */
export function tieneBloqueoVacante(hallazgos: readonly HallazgoVacante[]): boolean {
  return hallazgos.some((h) => h.severidad === "BLOQUEO");
}

// ── Puente Vacante → Funcionario (ADR-0009) ─────────────────────────────────

/**
 * Mapa dedicación (catálogo `vacante_dedicaciones`) → `tipoVinculacion` del
 * funcionario. Las cuatro dedicaciones docentes colapsan a DOCENTE; ADMINISTRATIVO
 * y OPS son 1:1. Se deja como `Record` literal para que TypeScript verifique que
 * los valores destino son `TipoVinculacion` válidos.
 */
const DEDICACION_A_TIPO_VINCULACION: Record<string, TipoVinculacion> = {
  ADMINISTRATIVO: "ADMINISTRATIVO",
  OPS: "OPS",
  TIEMPO_COMPLETO: "DOCENTE",
  MEDIO_TIEMPO: "DOCENTE",
  CATEDRATICO: "DOCENTE",
  TUTOR: "DOCENTE",
};

/**
 * Resuelve el `tipoVinculacion` del funcionario a crear al marcar una vacante
 * como CONTRATADO, a partir de su dedicación. Dedicación ausente o fuera del
 * catálogo → `null` (`tipo_vinculacion` es nullable; Talento Humano lo corrige
 * luego). Ver ADR-0009.
 */
export function tipoVinculacionDesdeDedicacion(
  dedicacion: string | null,
): TipoVinculacion | null {
  if (!dedicacion) return null;
  return DEDICACION_A_TIPO_VINCULACION[dedicacion] ?? null;
}

/**
 * Deriva el estado computado de una vacante (vencimiento, días, STATUS,
 * avisos) sin mutar ni persistir nada — se recalcula en cada lectura.
 */
export function derivarVacante(v: Vacante, hoyIso: string): VacanteDerivada {
  const fechaVencimiento = v.fechaRequerimiento ? calcularVencimientoVacante(v.fechaRequerimiento) : null;
  const diasParaVencer = fechaVencimiento ? diasParaVencerVacante(fechaVencimiento, v.estado, hoyIso) : null;
  const diasEnProceso = v.fechaRequerimiento
    ? diasEnProcesoVacante(v.fechaRequerimiento, v.fechaContratacion, hoyIso)
    : null;
  const status = calcularStatusVacante(v.estado, fechaVencimiento, hoyIso);
  const avisos = evaluarFila(v, hoyIso).filter((h) => h.severidad === "AVISO");

  return { ...v, fechaVencimiento, diasParaVencer, diasEnProceso, status, avisos };
}

// ── Dashboard: 7 KPIs + 6 series (espejo de App.Dashboard.calcularDatos) ────

export interface SerieCategoriaVacante {
  label: string;
  total: number;
}

export interface DashboardVacantesKpis {
  totalVacantes: number;
  /**
   * N.º de cargos distintos (mismo criterio que el v1: cuenta CARGO único, no
   * la suma de `posiciones` — se conserva el KPI tal como lo lee hoy Talento
   * Humano; ver `35_App_Dashboard.gs::_contarPosiciones`).
   */
  totalPosiciones: number;
  diasPromedioContratacion: number;
  vacantesActivas: number;
  vacantesVencidas: number;
  vencidasSinAvance: number;
  pctAprobacionPendiente: number;
}

export interface DashboardVacantes {
  kpis: DashboardVacantesKpis;
  series: {
    porStatus: SerieCategoriaVacante[];
    porArea: SerieCategoriaVacante[];
    porFase: SerieCategoriaVacante[];
    porMotivo: SerieCategoriaVacante[];
    fuentesContratados: SerieCategoriaVacante[];
    contratacionesPorMes: SerieCategoriaVacante[];
  };
}

/** Vacante derivada + nombre de área resuelto (el repo hace el join; el dominio agrupa). */
export interface VacanteConNombreArea extends VacanteDerivada {
  areaNombre: string | null;
}

function agrupar<T>(items: readonly T[], accessor: (item: T) => string | null): SerieCategoriaVacante[] {
  const conteos = new Map<string, number>();
  for (const item of items) {
    const valor = accessor(item);
    if (valor === null || valor.trim() === "") continue;
    conteos.set(valor, (conteos.get(valor) ?? 0) + 1);
  }
  return [...conteos.entries()].map(([label, total]) => ({ label, total }));
}

/**
 * Mismos KPIs y agrupaciones que el dashboard nativo del v1, sobre datos ya
 * derivados — único punto de verdad de "qué es el Dashboard de Vacantes".
 */
export function calcularDashboardVacantes(
  vacantes: readonly VacanteConNombreArea[],
  hoyIso: string,
): DashboardVacantes {
  const totalVacantes = vacantes.filter((v) => v.cargo.trim() !== "").length;

  const cargosUnicos = new Set(vacantes.map((v) => v.cargo.trim().toUpperCase()).filter((c) => c !== ""));
  const totalPosiciones = cargosUnicos.size;

  const contratadas = vacantes.filter((v) => v.estado === "CONTRATADO");
  const diasPromedioContratacion = contratadas.length
    ? Math.round(contratadas.reduce((acc, v) => acc + (v.diasEnProceso ?? 0), 0) / contratadas.length)
    : 0;

  const vacantesActivas = vacantes.filter((v) => v.estado === "PENDIENTE").length;
  const vacantesVencidas = vacantes.filter((v) => v.status === "VENCIDA").length;

  const vencidasSinAvance = vacantes.filter((v) => {
    if (v.estado === "CONTRATADO") return false;
    if (v.status !== "VENCIDA" || v.fase !== FASE_VACANTE_INICIAL || v.diasParaVencer === null) return false;
    return -v.diasParaVencer >= DIAS_ALERTA_VENCIDA_SIN_AVANCE;
  }).length;

  const conAprobacion = vacantes.filter((v) => v.aprobacion !== null);
  const pendientesAprobacion = conAprobacion.filter(
    (v) => v.aprobacion !== "APROBADO" && v.aprobacion !== "NO_APROBADO",
  );
  const pctAprobacionPendiente = conAprobacion.length
    ? Math.round((pendientesAprobacion.length / conAprobacion.length) * 100)
    : 0;

  const contratadosConFecha = contratadas.filter((v) => v.fechaContratacion !== null);

  return {
    kpis: {
      totalVacantes,
      totalPosiciones,
      diasPromedioContratacion,
      vacantesActivas,
      vacantesVencidas,
      vencidasSinAvance,
      pctAprobacionPendiente,
    },
    series: {
      porStatus: agrupar(vacantes, (v) => v.status),
      porArea: agrupar(vacantes, (v) => v.areaNombre),
      porFase: agrupar(vacantes, (v) => v.fase),
      porMotivo: agrupar(vacantes, (v) => v.motivo),
      fuentesContratados: agrupar(contratadas, (v) => v.fuente),
      contratacionesPorMes: agrupar(contratadosConFecha, (v) => v.fechaContratacion!.slice(0, 7)),
    },
  };
}
