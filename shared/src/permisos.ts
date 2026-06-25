/**
 * permisos.ts — Reglas de autorización puras (sin I/O).
 *
 * Deciden A DÓNDE aterriza cada rol y QUÉ alcance tiene. Al ser funciones puras se
 * prueban en aislamiento y se reutilizan tanto en el servidor (guardas reales) como
 * en la UI (mostrar/ocultar). La identidad la resuelve `lib/auth.ts`; aquí solo se
 * razona sobre un `Usuario` ya cargado.
 */

import type { EstadoUsuario, RolUsuario, Usuario } from "./domain.js";

/** Vistas de supervisión del catálogo de funcionarios. */
export type VistaSupervision = "todos" | "th" | "ci";

export const VISTAS_SUPERVISION: readonly VistaSupervision[] = [
  "todos",
  "th",
  "ci",
] as const;

/**
 * Ruta a la que se redirige a un usuario tras autenticarse, según su rol y estado.
 * Quien no está ACTIVO (PENDIENTE de asignación o INACTIVO) va a `/pendiente`.
 *
 * SUPERADMIN y TALENTO_HUMANO aterrizan en `/inicio` (home de la plataforma).
 * CONTROL_INTERNO y AREA entran directo a su trabajo en el módulo Paz y Salvo.
 */
export function rutaInicialPorRol(
  rol: RolUsuario,
  estado: EstadoUsuario,
): string {
  if (estado !== "ACTIVO") return "/pendiente";
  switch (rol) {
    case "SUPERADMIN":
      return "/inicio";
    case "TALENTO_HUMANO":
      return "/inicio";
    case "CONTROL_INTERNO":
      return "/paz-y-salvo/control-interno";
    case "AREA":
      return "/paz-y-salvo/mi-area";
  }
}

/**
 * Entrada de cada rol al módulo Paz y Salvo: su "oficina" dedicada. Fuente única
 * del mapeo rol→ruta del módulo, reutilizada por el sidebar y por los enlaces del
 * Panel para no apuntar nunca a una oficina ajena al rol.
 *
 * SUPERADMIN supervisa el catálogo completo; TALENTO_HUMANO y CONTROL_INTERNO
 * tienen su propia página (segregación de funciones); AREA va a su cola.
 */
export function rutaOficinaPorRol(rol: RolUsuario): string {
  switch (rol) {
    case "SUPERADMIN":
      return "/paz-y-salvo/funcionarios";
    case "TALENTO_HUMANO":
      return "/paz-y-salvo/talento-humano";
    case "CONTROL_INTERNO":
      return "/paz-y-salvo/control-interno";
    case "AREA":
      return "/paz-y-salvo/mi-area";
  }
}

/**
 * ¿Este rol tiene acceso al nivel de plataforma (home, módulos cruzados)?
 * SUPERADMIN y TALENTO_HUMANO operan la plataforma; CI y AREA son roles acotados
 * que trabajan directamente en su módulo.
 */
export function rolVePlataforma(rol: RolUsuario): boolean {
  return rol === "SUPERADMIN" || rol === "TALENTO_HUMANO";
}

/**
 * ¿Puede este usuario gestionar el área indicada? El superadmin puede con todas;
 * un usuario de área solo con la suya; el resto de roles no gestionan áreas.
 */
export function areaPermitida(usuario: Usuario, areaId: string): boolean {
  if (usuario.rol === "SUPERADMIN") return true;
  if (usuario.rol === "AREA") return usuario.areaId === areaId;
  return false;
}

/**
 * ¿Puede este rol ver una vista de supervisión? El superadmin ve todas; TH y CI
 * solo la suya; un usuario de área ninguna.
 */
export function rolPuedeVerVista(
  rol: RolUsuario,
  vista: VistaSupervision,
): boolean {
  if (rol === "SUPERADMIN") return true;
  if (rol === "TALENTO_HUMANO") return vista === "th";
  if (rol === "CONTROL_INTERNO") return vista === "ci";
  return false;
}
