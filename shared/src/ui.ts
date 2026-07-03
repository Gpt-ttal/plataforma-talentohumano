/**
 * ui.ts — Etiquetas, clases de color y formateadores compartidos por la UI.
 *
 * Las clases son strings estáticos (Tailwind no admite nombres construidos en
 * tiempo de ejecución), por eso se mapean explícitamente por estado.
 */

import type {
  EstadoArea,
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
  TipoVinculacion,
} from "./domain.js";
import type {
  AmbitoCapacitacion,
  EstadoRegistro,
  TipoVinculo,
} from "./capacitaciones.js";
import type { TipoContenidoLeccion } from "./cursos.js";
import type { EstadoCapacitacionPlaneada } from "./planificador.js";

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

/** Iniciales para el avatar del funcionario. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return "—";
  const a = partes[0]?.[0] ?? "";
  const b = partes[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
