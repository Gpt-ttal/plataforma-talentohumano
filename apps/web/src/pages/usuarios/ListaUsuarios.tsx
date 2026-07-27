import { useSearchParams } from "react-router-dom"
import { ROL_LABEL, estadoUsuarioPill } from "@pys/shared"
import { useUsuarios } from "../../hooks/useUsuarios"
import { useAreas } from "../../hooks/useAreas"
import { Avatar } from "../../components/ui/Avatar"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Paginacion } from "../../components/ui/Paginacion"
import { GestionUsuario } from "./GestionUsuario"

/**
 * Lista de usuarios registrados con asignación de rol/área y (des)activación.
 * Extraída de `UsuariosPage` para reusarla también en `/configuracion/usuarios`.
 * Los perfiles PENDIENTE se despliegan por defecto (priorizan asignación).
 */
export function ListaUsuarios({ basePath = "/usuarios" }: { basePath?: string }) {
  const [searchParams] = useSearchParams()
  const pagina = Number(searchParams.get("pagina")) || undefined

  const { data, isLoading, isError } = useUsuarios(pagina)
  const { data: areas } = useAreas()

  const cargando = isLoading || !data || !areas
  const areasOpc = (areas ?? []).map((a) => ({ id: a.id, nombre: a.nombre }))
  const areaNombrePorId = new Map((areas ?? []).map((a) => [a.id, a.nombre]))

  if (isError) {
    return (
      <div className="rounded-xl border border-estado-rechazo/30 bg-estado-rechazoBg px-4 py-3 text-sm text-estado-rechazo">
        No se pudieron cargar los usuarios. Vuelve a intentarlo.
      </div>
    )
  }

  if (cargando) return <ListaSkeleton filas={6} />

  return (
    <div className="space-y-7">
      <div className="space-y-2.5">
        {data.items.map((usr) => (
          <FilaDesplegable
            key={usr.id}
            defaultOpen={usr.estado === "PENDIENTE"}
            cabecera={
              <span className="flex min-w-0 items-center gap-3">
                <Avatar nombre={usr.nombre} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {usr.nombre}
                  </span>
                  <span className="block truncate text-xs text-muted">{usr.email}</span>
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <span className="text-xs text-muted">
                    {ROL_LABEL[usr.rol]}
                    {usr.areaId
                      ? ` · ${areaNombrePorId.get(usr.areaId) ?? "—"}`
                      : ""}
                  </span>
                  <span className={estadoUsuarioPill(usr.estado).className}>
                    {estadoUsuarioPill(usr.estado).label}
                  </span>
                </span>
              </span>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:hidden">
                <span className="text-xs text-muted">{ROL_LABEL[usr.rol]}</span>
                <span className={estadoUsuarioPill(usr.estado).className}>
                  {estadoUsuarioPill(usr.estado).label}
                </span>
              </div>
              <GestionUsuario
                usuarioId={usr.id}
                rol={usr.rol}
                areaId={usr.areaId}
                estado={usr.estado}
                areas={areasOpc}
              />
            </div>
          </FilaDesplegable>
        ))}
      </div>

      <Paginacion
        basePath={basePath}
        params={{}}
        pagina={data.pagina}
        totalPaginas={data.totalPaginas}
        total={data.total}
      />
    </div>
  )
}
