/**
 * usuarios.ts — Lógica pura del ciclo de vida de los usuarios (sin I/O).
 *
 *  - `decidirAltaUsuario`: qué rol/estado recibe alguien que se autoregistra
 *    (rechaza fuera del dominio institucional; el superadmin entra activo, el
 *    resto queda PENDIENTE de asignación).
 *  - `errorInvarianteUsuario`: invariante de integridad rol↔área que el repo y la
 *    capa de servicios usan como verja antes de escribir.
 *
 * Al ser puras se prueban en aislamiento y se reutilizan en servidor y UI.
 */

import type { EstadoUsuario, RolUsuario } from "./domain.js";

/** Normaliza un correo: recorta y pasa a minúsculas (los correos no distinguen caja). */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface DatosAlta {
  email: string;
  nombre: string;
  /** Correo que se promueve a SUPERADMIN automáticamente. */
  superadminEmail: string;
  /** Dominio institucional permitido (p.ej. "americana.edu.co"). */
  dominioPermitido: string;
}

export type DecisionAlta =
  | { permitido: false; motivo: string }
  | { permitido: true; rol: RolUsuario; estado: EstadoUsuario };

/**
 * Decide el alta de quien se autoregistra:
 *  - Fuera del dominio permitido → rechazado.
 *  - Correo del superadmin → SUPERADMIN/ACTIVO.
 *  - Cualquier otro correo del dominio → AREA/PENDIENTE (el superadmin reasigna).
 */
export function decidirAltaUsuario(datos: DatosAlta): DecisionAlta {
  // Fail-closed ante configuración incompleta: si el dominio institucional no
  // está configurado, no se admite a nadie (en vez de comparar contra "@" y
  // dejar pasar/crashear según el input). Espejo defensivo de un .env mal puesto.
  const dominio = datos.dominioPermitido?.trim().toLowerCase() ?? "";
  if (dominio === "") {
    return { permitido: false, motivo: "El dominio institucional no está configurado." };
  }

  const email = normalizarEmail(datos.email ?? "");

  // Comparación estricta del dominio: debe ser exactamente "@<dominio>" al final,
  // no basta con terminar en él (evita "evilamericana.edu.co").
  if (!email.endsWith(`@${dominio}`)) {
    return {
      permitido: false,
      motivo: `Solo se permite el acceso con correos @${dominio}.`,
    };
  }

  // Solo se promueve a SUPERADMIN si el correo de superadmin está configurado
  // (de lo contrario `normalizarEmail("")` daría "" y no coincidiría con nada).
  const superadmin = datos.superadminEmail?.trim()
    ? normalizarEmail(datos.superadminEmail)
    : "";
  if (superadmin !== "" && email === superadmin) {
    return { permitido: true, rol: "SUPERADMIN", estado: "ACTIVO" };
  }

  return { permitido: true, rol: "AREA", estado: "PENDIENTE" };
}

/**
 * Invariante de integridad rol↔área:
 *  - Un rol distinto de AREA nunca lleva área.
 *  - Un usuario de AREA ACTIVO debe tener área (mientras está PENDIENTE/INACTIVO
 *    puede no tenerla todavía).
 * Devuelve `null` si es válido, o un mensaje describiendo la violación.
 */
export function errorInvarianteUsuario(u: {
  rol: RolUsuario;
  estado: EstadoUsuario;
  areaId: string | null;
}): string | null {
  if (u.rol !== "AREA") {
    return u.areaId === null
      ? null
      : "Solo los usuarios de rol Área pueden tener un área asignada.";
  }
  // rol === "AREA"
  if (u.estado === "ACTIVO" && u.areaId === null) {
    return "Un usuario de Área activo debe tener un área asignada.";
  }
  return null;
}
