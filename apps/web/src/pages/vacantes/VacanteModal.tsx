import { useNavigate, useParams } from "react-router-dom"
import { useVacanteDetalle } from "../../hooks/useVacantes"
import { Modal } from "../../components/ui/Modal"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Icon } from "../../components/ui/dash/Icon"
import { VacanteDetalle } from "./VacanteDetalle"

/**
 * Modal de detalle de una vacante, montado por la ruta hija `:id` sobre el
 * listado. Envoltura fina: resuelve la carga por `useVacanteDetalle` y delega la
 * ficha a `VacanteDetalle`. Cierre determinista hacia el listado (`navigate("..")`)
 * para que un refresh o deep-link a `/vacantes/:id` vuelva siempre a la lista.
 */
export function VacanteModal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useVacanteDetalle(id)

  return (
    <Modal
      size="4xl"
      ariaLabel="Detalle de vacante"
      ariaLabelledby="titulo-vacante-detalle"
      cerrarAlClickFuera={false}
      onClose={() => navigate("..", { relative: "path" })}
    >
      {isLoading ? (
        <ListaSkeleton filas={6} />
      ) : isError || !data ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar la vacante"
          mensaje="Hubo un problema al consultar el proceso. Revisa tu conexión e inténtalo de nuevo, o vuelve al listado si el enlace ya no existe."
        />
      ) : (
        <VacanteDetalle vacante={data} />
      )}
    </Modal>
  )
}
