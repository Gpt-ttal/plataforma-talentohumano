import { useParams } from "react-router-dom"
import { Modal } from "../../components/ui/Modal"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { useExpediente } from "../../hooks/useArchivo"
import { DetalleFuncionario } from "../funcionarios/DetalleFuncionario"

/**
 * Expediente de un funcionario archivado, montado por la ruta hija `:id`. Reusa
 * `DetalleFuncionario` (la traza de auditoría disponible: áreas + observaciones +
 * hitos con autor/fecha). Para un trámite cerrado (PAZ_Y_SALVO) no hay acciones:
 * el detalle se muestra de solo lectura.
 */
export function ExpedienteModal() {
  const { id } = useParams()
  const { data, isLoading } = useExpediente(id)
  return (
    <Modal>
      {isLoading ? (
        <ListaSkeleton filas={5} />
      ) : data ? (
        <DetalleFuncionario detalle={data} />
      ) : null}
    </Modal>
  )
}
