import { rolPuedeVerVista } from "@pys/shared"
import type { RolUsuario, VistaSupervision } from "@pys/shared"
import { useAuth } from "../context/AuthContext"

/**
 * Gating de UX por rol (solo presentación). Reusa las reglas puras de `@pys/shared`
 * que el backend ya aplica como guardas reales; aquí únicamente se muestran/ocultan
 * acciones. Nunca es la fuente de autorización.
 */
export function useRole() {
  const { usuario } = useAuth()
  const rol = usuario?.rol ?? null

  return {
    rol,
    areaId: usuario?.areaId ?? null,
    esSuperadmin: rol === "SUPERADMIN",
    esTalentoHumano: rol === "TALENTO_HUMANO",
    esControlInterno: rol === "CONTROL_INTERNO",
    esArea: rol === "AREA",
    esSst: rol === "SST",
    /** ¿El rol actual debe ver una vista de supervisión (todos/th/ci)? */
    puedeVer: (vista: VistaSupervision) =>
      rol ? rolPuedeVerVista(rol, vista) : false,
    /** ¿El rol actual está dentro del conjunto permitido? */
    tieneRol: (...roles: RolUsuario[]) => (rol ? roles.includes(rol) : false),
  }
}
