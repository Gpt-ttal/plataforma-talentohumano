/**
 * ui.ts — Etiquetas, clases de color y formateadores compartidos por la UI.
 *
 * Las clases son strings estáticos (Tailwind no admite nombres construidos en
 * tiempo de ejecución), por eso se mapean explícitamente por estado.
 */

import type {
  EstadoArea,
  EstadoCivil,
  EstadoGlobal,
  EstadoUsuario,
  EstadoVinculacion,
  Genero,
  Modalidad,
  NivelFormacion,
  NovedadTipo,
  Parentesco,
  Rol,
  TipoContrato,
  TipoCuentaBancaria,
  TipoDocumento,
  TipoVinculacion,
} from "./domain.js";
import type {
  AmbitoCapacitacion,
  EstadoRegistro,
  TipoVinculo,
} from "./capacitaciones.js";
import type { TipoContenidoLeccion } from "./cursos.js";
import type { EstadoCapacitacionPlaneada } from "./planificador.js";
import type { FilaLoteEstado } from "./desvinculaciones.js";
import type { AccionDiff, OrigenLoteSync } from "./sync.js";
import { FASES_VACANTE } from "./vacantes.js";
import type { AprobacionPresupuestoVacante, EstadoVacante, FaseVacante, StatusVacante } from "./vacantes.js";

export const ESTADO_GLOBAL_LABEL: Record<EstadoGlobal, string> = {
  PENDIENTE: "Pendiente",
  LISTO_PARA_LIQUIDAR: "Listo para liquidar",
  LIQUIDACION_GENERADA: "Liquidación generada",
  PAZ_Y_SALVO: "Paz y salvo",
};

/** Etiqueta corta de rol para badges y selectores. */
export const ROL_LABEL: Record<Rol, string> = {
  SUPERADMIN: "Superadministrador",
  TALENTO_HUMANO: "Talento Humano",
  CONTROL_INTERNO: "Control Interno",
  AREA: "Área",
  SST: "Seguridad y Salud en el Trabajo",
};

export const ESTADO_AREA_LABEL: Record<EstadoArea, string> = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  NO_APLICA: "No aplica",
  NO_APROBADO: "Rechazado",
  DEVUELTO_POR_CI: "Devuelto por Control Interno",
};

/** Etiqueta del estado de vida del usuario (PENDIENTE/ACTIVO/INACTIVO). */
export const ESTADO_USUARIO_LABEL: Record<EstadoUsuario, string> = {
  PENDIENTE: "Pendiente",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
};

/**
 * Color del estado de usuario. Vive aquí (no en cada página) por la Regla del
 * Semáforo Único: una sola fuente de verdad de color por estado.
 */
export const ESTADO_USUARIO_BADGE: Record<EstadoUsuario, string> = {
  PENDIENTE: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
  ACTIVO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  INACTIVO: "bg-surface-2 text-muted ring-1 ring-border",
};

export const ESTADO_GLOBAL_BADGE: Record<EstadoGlobal, string> = {
  PENDIENTE: "bg-surface-2 text-muted ring-1 ring-border",
  LISTO_PARA_LIQUIDAR: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
  LIQUIDACION_GENERADA:
    "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  PAZ_Y_SALVO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
};

export const ESTADO_AREA_BADGE: Record<EstadoArea, string> = {
  PENDIENTE: "bg-surface-2 text-muted ring-1 ring-border",
  APROBADO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  NO_APLICA: "bg-surface-2 text-muted ring-1 ring-border",
  NO_APROBADO: "bg-estado-rechazoBg text-estado-rechazo ring-1 ring-estado-rechazo/40",
  DEVUELTO_POR_CI: "bg-estado-listoBg text-estado-listo ring-1 ring-estado-listo/40",
};

/**
 * Representación compacta para la celda de la matriz funcionario × área: un
 * símbolo + color por estado. Misma fuente de color que los badges (Regla del
 * Semáforo Único); colores AA (silver-600 mínimo). Clases literales para el purge.
 */
export const ESTADO_AREA_CELDA: Record<
  EstadoArea,
  { simbolo: string; className: string }
> = {
  PENDIENTE: { simbolo: "•", className: "text-silver-600" },
  APROBADO: { simbolo: "✓", className: "text-estado-ok" },
  NO_APLICA: { simbolo: "–", className: "text-silver-600" },
  NO_APROBADO: { simbolo: "✕", className: "text-estado-rechazo" },
  DEVUELTO_POR_CI: { simbolo: "↩", className: "text-estado-listo" },
};

/** Etiqueta del estado de una fila del lote de importación masiva. */
export const FILA_LOTE_ESTADO_LABEL: Record<FilaLoteEstado, string> = {
  VALIDA: "Válida",
  CON_ERROR: "Con error",
  DUPLICADA: "Duplicada en el archivo",
  CONFIRMADA: "Confirmada",
  DESCARTADA: "Descartada",
};

/** Color por estado de fila del lote (Regla del Semáforo Único). */
export const FILA_LOTE_ESTADO_BADGE: Record<FilaLoteEstado, string> = {
  VALIDA: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  CON_ERROR: "bg-estado-rechazoBg text-estado-rechazo ring-1 ring-estado-rechazo/40",
  DUPLICADA: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
  CONFIRMADA: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  DESCARTADA: "bg-surface-2 text-muted ring-1 ring-border",
};

/** Punto de color (semáforo) para listas compactas. */
export const ESTADO_GLOBAL_DOT: Record<EstadoGlobal, string> = {
  PENDIENTE: "bg-estado-pendiente",
  LISTO_PARA_LIQUIDAR: "bg-estado-listo",
  LIQUIDACION_GENERADA: "bg-estado-info",
  PAZ_Y_SALVO: "bg-estado-ok",
};

/**
 * Color por estado global en HEX. Para superficies que NO admiten clases
 * Tailwind (SVG / Recharts), donde el fill necesita un color literal. Misma
 * fuente de verdad que los badges/dots (Regla del Semáforo Único): los valores
 * son exactamente los tokens del Sello declarados en `tailwind.config.ts`.
 */
export const COLOR_ESTADO: Record<EstadoGlobal, string> = {
  PENDIENTE: "#8B93A6", // estado.pendiente
  LISTO_PARA_LIQUIDAR: "#B68D40", // estado.listo (oro)
  LIQUIDACION_GENERADA: "#3B6FD4", // estado.info
  PAZ_Y_SALVO: "#16936A", // estado.ok
};

/** Tonos HEX de la antigüedad del proceso (aging) para gráficas SVG. */
export const COLOR_AGING = {
  atrasados: "#A4231F", // estado.rechazo
  proximos: "#CBA135", // gold-400
  masAdelante: "#22406B", // navy-500
  sinFecha: "#AEB6C6", // silver-400
} as const;

/**
 * Base común de una "pill" de estado (clases literales). Centralizar aquí evita
 * que cada componente reconstruya el string y garantiza que Tailwind purgue bien.
 */
const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";

/** Pill de estado global ya resuelta: className completo + punto + etiqueta. */
export function estadoGlobalPill(estado: EstadoGlobal): {
  className: string;
  dot: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ESTADO_GLOBAL_BADGE[estado]}`,
    dot: ESTADO_GLOBAL_DOT[estado],
    label: ESTADO_GLOBAL_LABEL[estado],
  };
}

/** Pill de estado de área ya resuelta: className completo + etiqueta. */
export function estadoAreaPill(estado: EstadoArea): {
  className: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ESTADO_AREA_BADGE[estado]}`,
    label: ESTADO_AREA_LABEL[estado],
  };
}

/** Pill de estado de fila del lote de importación masiva ya resuelta. */
export function filaLoteEstadoPill(estado: FilaLoteEstado): {
  className: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${FILA_LOTE_ESTADO_BADGE[estado]}`,
    label: FILA_LOTE_ESTADO_LABEL[estado],
  };
}

/** Pill de estado de usuario ya resuelta: className completo + etiqueta. */
export function estadoUsuarioPill(estado: EstadoUsuario): {
  className: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ESTADO_USUARIO_BADGE[estado]}`,
    label: ESTADO_USUARIO_LABEL[estado],
  };
}

// ── Administración de Personal ───────────────────────────────────────────────

/** Etiqueta del estado de vinculación (derivado en `personal.ts`). */
export const ESTADO_VINCULACION_LABEL: Record<EstadoVinculacion, string> = {
  ACTIVO: "Activo",
  EN_RETIRO: "En retiro",
  RETIRADO: "Retirado",
};

/**
 * Color del estado de vinculación (Regla del Semáforo Único, tokens del Sello):
 * ACTIVO = ok/verde (vínculo vigente); EN_RETIRO = oro (trámite en curso, hito);
 * RETIRADO = neutro (histórico).
 */
export const ESTADO_VINCULACION_BADGE: Record<EstadoVinculacion, string> = {
  ACTIVO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  EN_RETIRO: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
  RETIRADO: "bg-surface-2 text-muted ring-1 ring-border",
};

export const ESTADO_VINCULACION_DOT: Record<EstadoVinculacion, string> = {
  ACTIVO: "bg-estado-ok",
  EN_RETIRO: "bg-estado-listo",
  RETIRADO: "bg-estado-pendiente",
};

/** Pill de estado de vinculación ya resuelta: className + punto + etiqueta. */
export function estadoVinculacionPill(estado: EstadoVinculacion): {
  className: string;
  dot: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ESTADO_VINCULACION_BADGE[estado]}`,
    dot: ESTADO_VINCULACION_DOT[estado],
    label: ESTADO_VINCULACION_LABEL[estado],
  };
}

/** Etiqueta del tipo de vinculación del empleado. */
export const TIPO_VINCULACION_LABEL: Record<TipoVinculacion, string> = {
  ADMINISTRATIVO: "Administrativo",
  DOCENTE: "Docente",
  OPS: "Prestación de servicios",
};

/** Badge neutro del tipo de vinculación (no es un estado; solo clasifica). */
export const TIPO_VINCULACION_BADGE: Record<TipoVinculacion, string> = {
  ADMINISTRATIVO: "bg-surface-2 text-muted ring-1 ring-border",
  DOCENTE: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  OPS: "bg-surface-2 text-muted ring-1 ring-border",
};

/** Badge de tipo de vinculación ya resuelto: className + etiqueta. */
export function tipoVinculacionBadge(tipo: TipoVinculacion): {
  className: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${TIPO_VINCULACION_BADGE[tipo]}`,
    label: TIPO_VINCULACION_LABEL[tipo],
  };
}

/** Etiqueta del tipo de novedad laboral ("Otro sí"). */
export const NOVEDAD_TIPO_LABEL: Record<NovedadTipo, string> = {
  CAMBIO_CARGO: "Cambio de cargo",
  EXTENSION_CONTRATO: "Extensión de contrato",
};

// ── Hoja de vida 360° ────────────────────────────────────────────────────────

/** Etiqueta legible del tipo de contrato (eje distinto a `tipoVinculacion`). */
export const TIPO_CONTRATO_LABEL: Record<TipoContrato, string> = {
  TERMINO_FIJO: "Término fijo",
  TERMINO_INDEFINIDO: "Término indefinido",
  OBRA_LABOR: "Obra o labor",
  PRESTACION_SERVICIOS: "Prestación de servicios",
};

/** Etiqueta legible de la modalidad de trabajo. */
export const MODALIDAD_LABEL: Record<Modalidad, string> = {
  PRESENCIAL: "Presencial",
  HIBRIDO: "Híbrido",
  VIRTUAL: "Virtual",
};

/** Etiqueta legible del género. */
export const GENERO_LABEL: Record<Genero, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
};

/** Etiqueta legible del parentesco de un familiar. */
export const PARENTESCO_LABEL: Record<Parentesco, string> = {
  CONYUGE: "Cónyuge",
  HIJO: "Hijo(a)",
  PADRE: "Padre",
  MADRE: "Madre",
  OTRO: "Otro",
};

/** Etiqueta legible del nivel de formación académica. */
export const NIVEL_FORMACION_LABEL: Record<NivelFormacion, string> = {
  BACHILLER: "Bachiller",
  TECNICO: "Técnico",
  TECNOLOGO: "Tecnólogo",
  PROFESIONAL: "Profesional",
  ESPECIALIZACION: "Especialización",
  MAESTRIA: "Maestría",
  DOCTORADO: "Doctorado",
  POSTDOCTORADO: "Postdoctorado",
};

// ── Atributos Iceberg (hoja de vida 360°) ────────────────────────────────────

/** Etiqueta legible del tipo de documento de identidad. */
export const TIPO_DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
  PASAPORTE: "Pasaporte",
  PEP: "Permiso especial de permanencia",
  TI: "Tarjeta de identidad",
  NIT: "NIT",
};

/** Etiqueta legible del estado civil. */
export const ESTADO_CIVIL_LABEL: Record<EstadoCivil, string> = {
  SOLTERO: "Soltero(a)",
  CASADO: "Casado(a)",
  UNION_LIBRE: "Unión libre",
  SEPARADO: "Separado(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUDO: "Viudo(a)",
};

/** Etiqueta legible del tipo de cuenta bancaria. */
export const TIPO_CUENTA_BANCARIA_LABEL: Record<TipoCuentaBancaria, string> = {
  AHORROS: "Ahorros",
  CORRIENTE: "Corriente",
};

// ── Sync de personal (Iceberg) ───────────────────────────────────────────────
// El estado de fila del lote reusa `filaLoteEstadoPill` (Semáforo Único). Lo
// propio del sync es el ORIGEN del lote y la ACCIÓN por campo del diff.

/** Etiqueta del origen del lote de sync. */
export const ORIGEN_LOTE_SYNC_LABEL: Record<OrigenLoteSync, string> = {
  SERVICIO: "Automático (Iceberg)",
  MANUAL: "Carga manual",
};

/** Etiqueta de la acción de un campo en el diff de revisión. */
export const ACCION_DIFF_LABEL: Record<AccionDiff, string> = {
  CREA: "Nuevo",
  ACTUALIZA: "Actualiza",
  SIN_CAMBIO: "Sin cambio",
  CONFLICTO_MANUAL: "Conflicto manual",
};

/**
 * Color de la acción del diff (Regla del Semáforo Único, tokens del Sello):
 * CREA = ok/verde (alta); ACTUALIZA = info/navy (cambio normal); SIN_CAMBIO =
 * neutro (no se toca); CONFLICTO_MANUAL = oro (atención: pisa edición manual).
 */
export const ACCION_DIFF_BADGE: Record<AccionDiff, string> = {
  CREA: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  ACTUALIZA: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  SIN_CAMBIO: "bg-surface-2 text-muted ring-1 ring-border",
  CONFLICTO_MANUAL: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
};

/** Pill de la acción del diff ya resuelta: className + etiqueta. */
export function accionDiffPill(accion: AccionDiff): {
  className: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ACCION_DIFF_BADGE[accion]}`,
    label: ACCION_DIFF_LABEL[accion],
  };
}

// ── Capacitaciones ───────────────────────────────────────────────────────────

/** Etiqueta legible del ámbito de una capacitación. */
export const AMBITO_LABEL: Record<AmbitoCapacitacion, string> = {
  TH: "Talento Humano",
  SST: "Seguridad y Salud en el Trabajo",
};

/** Etiqueta legible del tipo de vínculo del asistente. */
export const TIPO_VINCULO_LABEL: Record<TipoVinculo, string> = {
  PLANTA: "Planta",
  CONTRATISTA: "Contratista",
  EXTERNO: "Externo",
};

/** Etiqueta del estado del registro de asistencia. */
export const ESTADO_REGISTRO_LABEL: Record<EstadoRegistro, string> = {
  BORRADOR: "Borrador",
  ABIERTO: "Registro abierto",
  CERRADO: "Registro cerrado",
};

/**
 * Color del estado de registro. Vive aquí (no en cada página) por la Regla del
 * Semáforo Único. BORRADOR = neutro; ABIERTO = ok/verde (acepta asistentes);
 * CERRADO = info/navy (evidencia consolidada).
 */
export const ESTADO_REGISTRO_BADGE: Record<EstadoRegistro, string> = {
  BORRADOR: "bg-surface-2 text-muted ring-1 ring-border",
  ABIERTO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  CERRADO: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
};

/** Punto de color del estado de registro, para listas compactas. */
export const ESTADO_REGISTRO_DOT: Record<EstadoRegistro, string> = {
  BORRADOR: "bg-estado-pendiente",
  ABIERTO: "bg-estado-ok",
  CERRADO: "bg-estado-info",
};

/** Pill de estado de registro ya resuelta: className + punto + etiqueta. */
export function estadoRegistroPill(estado: EstadoRegistro): {
  className: string;
  dot: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ESTADO_REGISTRO_BADGE[estado]}`,
    dot: ESTADO_REGISTRO_DOT[estado],
    label: ESTADO_REGISTRO_LABEL[estado],
  };
}

// ── Cursos ────────────────────────────────────────────────────────────────────
// `Curso.estadoRegistro` reutiliza tal cual `ESTADO_REGISTRO_LABEL/BADGE/DOT` de
// arriba (Semáforo Único) — no se crea un mapa nuevo para eso.

/** Etiqueta legible del tipo de contenido de una lección. */
export const TIPO_CONTENIDO_LABEL: Record<TipoContenidoLeccion, string> = {
  TEXTO: "Texto",
  VIDEO: "Video",
};

// ── Planificador ──────────────────────────────────────────────────────────────

/** Etiqueta del estado de una capacitación planeada. */
export const ESTADO_CAP_PLANEADA_LABEL: Record<
  EstadoCapacitacionPlaneada,
  string
> = {
  PLANEADA: "Planeada",
  EN_CURSO: "En curso",
  COMPLETADA: "Completada",
};

/**
 * Color del estado de una capacitación planeada. Vive aquí (Regla del
 * Semáforo Único). PLANEADA = neutro (como BORRADOR); EN_CURSO = ok/verde
 * (como ABIERTO); COMPLETADA = info/navy (como CERRADO).
 */
export const ESTADO_CAP_PLANEADA_BADGE: Record<
  EstadoCapacitacionPlaneada,
  string
> = {
  PLANEADA: "bg-surface-2 text-muted ring-1 ring-border",
  EN_CURSO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  COMPLETADA: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
};

/** Punto de color del estado de una capacitación planeada, para listas compactas. */
export const ESTADO_CAP_PLANEADA_DOT: Record<
  EstadoCapacitacionPlaneada,
  string
> = {
  PLANEADA: "bg-estado-pendiente",
  EN_CURSO: "bg-estado-ok",
  COMPLETADA: "bg-estado-info",
};

/** Pill de estado de capacitación planeada ya resuelta: className + punto + etiqueta. */
export function estadoCapacitacionPlaneadaPill(
  estado: EstadoCapacitacionPlaneada,
): { className: string; dot: string; label: string } {
  return {
    className: `${PILL_BASE} ${ESTADO_CAP_PLANEADA_BADGE[estado]}`,
    dot: ESTADO_CAP_PLANEADA_DOT[estado],
    label: ESTADO_CAP_PLANEADA_LABEL[estado],
  };
}

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formatea un valor en pesos colombianos (COP, sin decimales). `—` si no aplica. */
export function formatMoneda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

// ── Vacantes ──────────────────────────────────────────────────────────────────

/** Etiqueta legible del estado capturado del proceso de vacante. */
export const ESTADO_VACANTE_LABEL: Record<EstadoVacante, string> = {
  PENDIENTE: "Pendiente",
  CONTRATADO: "Contratado",
  CANCELADA: "Cancelada",
  CERRADA_PROMOCION: "Cerrada por promoción",
  PAUSADA: "Pausada",
};

/** Etiqueta legible del STATUS derivado (vigencia de la vacante). */
export const STATUS_VACANTE_LABEL: Record<StatusVacante, string> = {
  VIGENTE: "Vigente",
  VENCIDA: "Vencida",
  CUBIERTA: "Cubierta",
  CERRADA: "Cerrada",
};

/**
 * Color del STATUS derivado (Regla del Semáforo Único, tokens del Sello):
 * VIGENTE = ok/verde (proceso activo y sano); VENCIDA = rechazo/rojo;
 * CUBIERTA = info/navy (posición ya llena); CERRADA = neutro (histórico).
 */
export const STATUS_VACANTE_BADGE: Record<StatusVacante, string> = {
  VIGENTE: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  VENCIDA: "bg-estado-rechazoBg text-estado-rechazo ring-1 ring-estado-rechazo/40",
  CUBIERTA: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  CERRADA: "bg-surface-2 text-muted ring-1 ring-border",
};

export const STATUS_VACANTE_DOT: Record<StatusVacante, string> = {
  VIGENTE: "bg-estado-ok",
  VENCIDA: "bg-estado-rechazo",
  CUBIERTA: "bg-estado-info",
  CERRADA: "bg-estado-pendiente",
};

/** Pill de STATUS de vacante ya resuelta: className + punto + etiqueta. */
export function estadoVacantePill(status: StatusVacante): {
  className: string;
  dot: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${STATUS_VACANTE_BADGE[status]}`,
    dot: STATUS_VACANTE_DOT[status],
    label: STATUS_VACANTE_LABEL[status],
  };
}

/**
 * Color del estado capturado del ciclo de vida (Regla del Semáforo Único):
 * PENDIENTE = plata/neutro (en curso); CONTRATADO = ok/verde (objetivo cumplido);
 * CANCELADA = rechazo/rojo; PAUSADA = oro (a la espera, hito); CERRADA_PROMOCION = info/azul.
 */
export const ESTADO_VACANTE_BADGE: Record<EstadoVacante, string> = {
  PENDIENTE: "bg-surface-2 text-muted ring-1 ring-border",
  CONTRATADO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  CANCELADA: "bg-estado-rechazoBg text-estado-rechazo ring-1 ring-estado-rechazo/40",
  PAUSADA: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
  CERRADA_PROMOCION: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
};

export const ESTADO_VACANTE_DOT: Record<EstadoVacante, string> = {
  PENDIENTE: "bg-estado-pendiente",
  CONTRATADO: "bg-estado-ok",
  CANCELADA: "bg-estado-rechazo",
  PAUSADA: "bg-estado-listo",
  CERRADA_PROMOCION: "bg-estado-info",
};

/** Pill del estado capturado del ciclo de vida de la vacante ya resuelta. */
export function estadoCapturadoVacantePill(estado: EstadoVacante): {
  className: string;
  dot: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${ESTADO_VACANTE_BADGE[estado]}`,
    dot: ESTADO_VACANTE_DOT[estado],
    label: ESTADO_VACANTE_LABEL[estado],
  };
}

/** Etiqueta legible de la aprobación presupuestal de la vacante. */
export const APROBACION_VACANTE_LABEL: Record<AprobacionPresupuestoVacante, string> = {
  SOLICITADO: "Solicitado",
  EN_REVISION: "En revisión",
  APROBADO: "Aprobado",
  NO_APROBADO: "No aprobado",
};

/**
 * Color de la aprobación presupuestal (Regla del Semáforo Único):
 * SOLICITADO = plata/neutro; EN_REVISION = info/azul; APROBADO = ok/verde;
 * NO_APROBADO = rechazo/rojo.
 */
export const APROBACION_VACANTE_BADGE: Record<AprobacionPresupuestoVacante, string> = {
  SOLICITADO: "bg-surface-2 text-muted ring-1 ring-border",
  EN_REVISION: "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  APROBADO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  NO_APROBADO: "bg-estado-rechazoBg text-estado-rechazo ring-1 ring-estado-rechazo/40",
};

/** Pill de aprobación presupuestal ya resuelta: className + etiqueta (sin punto). */
export function aprobacionVacantePill(aprobacion: AprobacionPresupuestoVacante): {
  className: string;
  label: string;
} {
  return {
    className: `${PILL_BASE} ${APROBACION_VACANTE_BADGE[aprobacion]}`,
    label: APROBACION_VACANTE_LABEL[aprobacion],
  };
}

/** Etiqueta legible de cada fase del proceso de reclutamiento. */
export const FASE_VACANTE_LABEL: Record<FaseVacante, string> = {
  RECLUTAMIENTO: "Reclutamiento",
  APROBACION_VICERRECTORIA: "Aprobación de Vicerrectoría",
  PRUEBAS_IDONEIDAD: "Pruebas de idoneidad",
  PRUEBAS_PSICOTECNICAS: "Pruebas psicotécnicas",
  EXAMEN_MEDICO: "Examen médico",
  POLIGRAFIA: "Poligrafía",
  CONTRATACION: "Contratación",
};

/** Fase: un solo tono neutro-informativo (progreso, no semáforo de calidad). */
export const FASE_VACANTE_BADGE = "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30";

/** Pill de fase ya resuelta: className + etiqueta (fuera del stepper, ej. filtros/listas). */
export function faseVacantePill(fase: FaseVacante): { className: string; label: string } {
  return {
    className: `${PILL_BASE} ${FASE_VACANTE_BADGE}`,
    label: FASE_VACANTE_LABEL[fase],
  };
}

/**
 * Tono de cada nodo del stepper según su posición relativa a la fase actual
 * (3 tonos, no 7 colores distintos). El oro queda reservado exclusivamente al
 * paso "actual" (Regla del Sello) — nunca a un paso completado o pendiente.
 */
export const FASE_VACANTE_PASO_TONO: Record<"completado" | "actual" | "pendiente", string> = {
  completado: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  actual: "bg-gold-50 text-gold-700 ring-1 ring-gold-400/60",
  pendiente: "bg-surface-2 text-muted ring-1 ring-border",
};

/** Índice (0-based) de una fase dentro de la secuencia de las 7 — para el stepper. */
export function indiceFaseVacante(fase: FaseVacante): number {
  return FASES_VACANTE.indexOf(fase);
}

/**
 * Color del STATUS derivado en HEX (para Recharts, que no admite clases
 * Tailwind). Misma fuente de verdad que `STATUS_VACANTE_BADGE`/`_DOT`.
 */
export const COLOR_STATUS_VACANTE: Record<StatusVacante, string> = {
  VIGENTE: "#16936A", // estado.ok
  VENCIDA: "#A4231F", // estado.rechazo
  CUBIERTA: "#3B6FD4", // estado.info
  CERRADA: "#8B93A6", // estado.pendiente
};

/** Iniciales para el avatar del funcionario. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return "—";
  const a = partes[0]?.[0] ?? "";
  const b = partes[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
