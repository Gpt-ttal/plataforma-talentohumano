/**
 * ui.ts — Etiquetas, clases de color y formateadores compartidos por la UI.
 *
 * Las clases son strings estáticos (Tailwind no admite nombres construidos en
 * tiempo de ejecución), por eso se mapean explícitamente por estado.
 */

import type { EstadoArea, EstadoGlobal, EstadoUsuario, Rol } from "./domain.js";

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
  INACTIVO: "bg-silver-100 text-silver-600 ring-1 ring-silver-300",
};

export const ESTADO_GLOBAL_BADGE: Record<EstadoGlobal, string> = {
  PENDIENTE: "bg-silver-100 text-silver-600 ring-1 ring-silver-300",
  LISTO_PARA_LIQUIDAR: "bg-gold-50 text-gold-700 ring-1 ring-gold-300/60",
  LIQUIDACION_GENERADA:
    "bg-estado-infoBg text-estado-info ring-1 ring-estado-info/30",
  PAZ_Y_SALVO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
};

export const ESTADO_AREA_BADGE: Record<EstadoArea, string> = {
  PENDIENTE: "bg-silver-100 text-silver-600 ring-1 ring-silver-300",
  APROBADO: "bg-estado-okBg text-estado-ok ring-1 ring-estado-ok/30",
  NO_APLICA: "bg-silver-50 text-silver-600 ring-1 ring-silver-200",
  NO_APROBADO: "bg-red-50 text-estado-rechazo ring-1 ring-estado-rechazo/40",
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

/** Iniciales para el avatar del funcionario. */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return "—";
  const a = partes[0]?.[0] ?? "";
  const b = partes[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
