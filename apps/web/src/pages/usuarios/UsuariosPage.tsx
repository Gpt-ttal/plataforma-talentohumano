import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { ListaUsuarios } from "./ListaUsuarios"

/**
 * Gestión de usuarios (solo SUPERADMIN). Asigna rol/área a quienes ya ingresaron y
 * (des)activa accesos. La lista vive en `ListaUsuarios` (reusada en Configuración);
 * el alta de nuevos accesos se hace por allowlist en `/configuracion/usuarios`.
 */
export function UsuariosPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Usuarios"
        description="Asigna rol y área a quienes ya tienen acceso, activa o inactiva cuentas, y prioriza los perfiles pendientes."
        meta={
          <>
            <span>Control de acceso</span>
            <span className="hidden text-faint sm:inline">/</span>
            <HeaderMetaDot tone="info">Roles por operación</HeaderMetaDot>
          </>
        }
      />
      <ListaUsuarios />
    </div>
  )
}
