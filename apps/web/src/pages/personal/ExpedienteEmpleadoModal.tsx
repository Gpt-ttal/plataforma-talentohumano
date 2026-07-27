import { useNavigate, useParams } from "react-router-dom"
import { useExpediente } from "../../hooks/usePersonal"
import { Modal } from "../../components/ui/Modal"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Icon } from "../../components/ui/dash/Icon"
import { Expediente } from "./Expediente"

/**
 * Modal de la hoja de vida 360° de un empleado, montado por la ruta hija `:id`
 * sobre el maestro. Envoltura fina: resuelve la carga por `useExpediente` (el de
 * `usePersonal`, no el de `useArchivo`) y delega la ficha a `Expediente`. Nombre
 * `ExpedienteEmpleadoModal` para no colisionar con `archivo/ExpedienteModal`.
 * Cierre determinista hacia el maestro (`navigate("..")`).
 */
export function ExpedienteEmpleadoModal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useExpediente(id)

  return (
    <Modal
      size="4xl"
      ariaLabel="Hoja de vida 360°"
      ariaLabelledby="titulo-expediente"
      cerrarAlClickFuera={false}
      onClose={() => navigate("..", { relative: "path" })}
    >
      {isLoading ? (
        <ListaSkeleton filas={6} />
      ) : isError || !data ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar el expediente"
          mensaje="Hubo un problema al consultar la hoja de vida del empleado. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : (
        <Expediente exp={data} />
      )}
    </Modal>
  )
}
