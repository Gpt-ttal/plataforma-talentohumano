import { ROL_LABEL, estadoUsuarioPill } from "@pys/shared"
import { Panel } from "../../components/ui/dash/primitives"
import { Icon } from "../../components/ui/dash/Icon"
import { BotonSalir } from "../../components/BotonSalir"
import { useAuth } from "../../context/AuthContext"
import { InfoRow } from "./ui"

/**
 * Seguridad — identidad de la sesión y cierre. Los datos vienen del usuario REAL
 * (`useAuth().usuarioReal`, sin impersonación): email institucional, rol/estado que
 * el backend resolvió y el dominio permitido. El acceso lo controla el servidor;
 * aquí solo se expone lo vigente y el botón de salida.
 */
export function SeguridadPage() {
  const { usuarioReal } = useAuth()
  const estado = usuarioReal ? estadoUsuarioPill(usuarioReal.estado) : null

  return (
    <div className="space-y-6">
      <Panel icon="shield-check" title="Identidad de la sesión">
        <div className="space-y-0">
          <InfoRow label="Nombre" value={usuarioReal?.nombre ?? "—"} />
          <InfoRow label="Correo" value={usuarioReal?.email ?? "—"} mono />
          <InfoRow
            label="Rol"
            value={usuarioReal ? ROL_LABEL[usuarioReal.rol] : "—"}
          />
          <InfoRow
            label="Estado"
            value={
              estado ? (
                <span className={estado.className}>{estado.label}</span>
              ) : (
                "—"
              )
            }
          />
          <InfoRow label="Dominio permitido" value="@americana.edu.co" mono />
          <InfoRow label="Autenticación" value="Google · Supabase Auth" />
        </div>
      </Panel>

      <Panel icon="lock" title="Acceso">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-muted">
            El ingreso es solo con la cuenta institucional de Google. La sesión se
            renueva automáticamente; ciérrala si usas un equipo compartido.
          </p>
          <BotonSalir className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-estado-rechazo/30 bg-estado-rechazoBg px-3.5 text-xs font-semibold text-estado-rechazo transition-colors hover:border-estado-rechazo/50">
            <Icon name="logout" className="h-3.5 w-3.5" />
            Cerrar sesión
          </BotonSalir>
        </div>
      </Panel>
    </div>
  )
}
