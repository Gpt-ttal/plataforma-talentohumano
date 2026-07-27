import { ListaUsuarios } from "../usuarios/ListaUsuarios"
import { GestionPreaprobados } from "./GestionPreaprobados"

/**
 * Sub-página Usuarios de Configuración (solo SUPERADMIN). Dos zonas: la allowlist de
 * acceso (autorizar/retirar correos, alta por pre-aprobación) y la gestión de los
 * usuarios ya registrados (rol/área, activar/inactivar), reusada de `/usuarios`. El
 * shell ya provee el encabezado; aquí solo van las superficies.
 */
export function UsuariosConfigPage() {
  return (
    <div className="space-y-8">
      <GestionPreaprobados />
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Usuarios registrados</h2>
          <p className="mt-0.5 text-xs text-muted">
            Ajusta rol y área o inactiva el acceso de quienes ya ingresaron.
          </p>
        </div>
        <ListaUsuarios basePath="/configuracion/usuarios" />
      </section>
    </div>
  )
}
