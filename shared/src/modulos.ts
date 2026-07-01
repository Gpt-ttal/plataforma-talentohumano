import type { RolUsuario } from "./domain.js";

/**
 * Un módulo es un subdominio de la plataforma con su propia URL base, ícono,
 * conjunto de roles con acceso y estado de disponibilidad. Esta es la fuente
 * única de verdad de qué módulos existen y quién los ve; el lanzador del Panel
 * y el sidebar la consumen vía `modulosParaRol`. Añadir un módulo nuevo = añadir
 * una fila a `MODULOS`.
 */
export interface Modulo {
  id: string;
  nombre: string;
  /** Nombre de un ícono de `dash/Icon.tsx` (la web lo castea a su `IconName`). */
  icono: string;
  rutaBase: string;
  /** Microcopy de una línea para el lanzador. */
  nota: string;
  rolesQueVen: RolUsuario[];
  estado: "ACTIVO" | "PROXIMO";
}

export const MODULOS: Modulo[] = [
  {
    id: "paz-y-salvo",
    nombre: "Paz y Salvo",
    icono: "shield-check",
    rutaBase: "/paz-y-salvo",
    nota: "Trámite de retiro institucional",
    rolesQueVen: ["SUPERADMIN", "TALENTO_HUMANO", "CONTROL_INTERNO", "AREA"],
    estado: "ACTIVO",
  },
  {
    id: "capacitaciones",
    nombre: "Capacitaciones",
    icono: "grad-cap",
    rutaBase: "/capacitaciones",
    nota: "Formación y registro de asistencia",
    rolesQueVen: ["SUPERADMIN", "TALENTO_HUMANO", "SST"],
    estado: "ACTIVO",
  },
  {
    id: "reportes",
    nombre: "Reportes",
    icono: "briefcase",
    rutaBase: "/reportes",
    nota: "Métricas y exportaciones del proceso",
    rolesQueVen: ["SUPERADMIN", "TALENTO_HUMANO"],
    estado: "PROXIMO",
  },
  {
    id: "organigrama",
    nombre: "Organigrama",
    icono: "building",
    rutaBase: "/organigrama",
    nota: "Estructura organizacional",
    rolesQueVen: ["SUPERADMIN"],
    estado: "PROXIMO",
  },
];

/** Módulos visibles para un rol, en el orden declarado en `MODULOS`. */
export function modulosParaRol(rol: RolUsuario): Modulo[] {
  return MODULOS.filter((m) => m.rolesQueVen.includes(rol));
}
