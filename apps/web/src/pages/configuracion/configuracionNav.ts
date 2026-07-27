import type { RolUsuario } from "@pys/shared"
import type { IconName } from "../../components/ui/dash/Icon"

/**
 * Fuente única del nav de la suite de Configuración (adaptado del `settingsNav.ts`
 * de SIGAF). El aside del shell y los accesos rápidos de General se derivan de aquí;
 * cada ítem declara qué roles lo ven. `icono` es un `IconName` del set `dash/Icon`.
 *
 * Regla de visibilidad: las sub-páginas personales (General, Apariencia, Seguridad,
 * Sistema) las ve cualquier rol activo; las de gobierno (Usuarios, Roles, Catálogos)
 * son solo SUPERADMIN. El backend garantiza la autorización real; esto solo pinta.
 */
export interface ConfiguracionNavItem {
  id: string
  /** Ruta absoluta de la sub-página. */
  to: string
  label: string
  /** Microcopy de una línea para el aside y los accesos rápidos. */
  desc: string
  icono: IconName
  roles: RolUsuario[]
}

const TODOS: RolUsuario[] = [
  "SUPERADMIN",
  "TALENTO_HUMANO",
  "CONTROL_INTERNO",
  "AREA",
  "SST",
]

const SOLO_SA: RolUsuario[] = ["SUPERADMIN"]

/** Gobierno operativo del servicio: SUPERADMIN y TALENTO_HUMANO. */
const SA_TH: RolUsuario[] = ["SUPERADMIN", "TALENTO_HUMANO"]

/**
 * Ítems del nav. Solo se listan las sub-páginas ya enrutadas (nav honesto, sin
 * enlaces muertos): las de gobierno se agregan en sus fases (Usuarios/Roles/
 * Catálogos) cuando exista su ruta y backend.
 */
export const CONFIGURACION_NAV: ConfiguracionNavItem[] = [
  {
    id: "general",
    to: "/configuracion/general",
    label: "General",
    desc: "Resumen del producto y accesos",
    icono: "grid",
    roles: TODOS,
  },
  {
    id: "apariencia",
    to: "/configuracion/apariencia",
    label: "Apariencia",
    desc: "Tema y paleta institucional",
    icono: "eye",
    roles: TODOS,
  },
  {
    id: "seguridad",
    to: "/configuracion/seguridad",
    label: "Seguridad",
    desc: "Sesión, identidad y acceso",
    icono: "shield-check",
    roles: TODOS,
  },
  {
    id: "sistema",
    to: "/configuracion/sistema",
    label: "Sistema",
    desc: "Estado del servicio y versión",
    icono: "server",
    // Detalle de infraestructura (stack, entorno) → solo gobierno operativo.
    roles: SA_TH,
  },
  {
    id: "usuarios",
    to: "/configuracion/usuarios",
    label: "Usuarios",
    desc: "Autorizar accesos y asignar roles",
    icono: "users",
    roles: SOLO_SA,
  },
  {
    id: "roles",
    to: "/configuracion/roles",
    label: "Roles y permisos",
    desc: "Qué módulos ve cada rol",
    icono: "lock",
    roles: SOLO_SA,
  },
  {
    id: "catalogos",
    to: "/configuracion/catalogos",
    label: "Catálogos",
    desc: "Áreas de visto bueno y más",
    icono: "database",
    roles: SOLO_SA,
  },
]

/** Ítems de Configuración visibles para un rol, en el orden declarado. */
export function navParaRol(rol: RolUsuario): ConfiguracionNavItem[] {
  return CONFIGURACION_NAV.filter((item) => item.roles.includes(rol))
}

export { SOLO_SA }
