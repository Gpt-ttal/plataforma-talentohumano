import { useParams } from "react-router-dom"
import { Modal } from "../../components/ui/Modal"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { useFuncionarioDetalle } from "../../hooks/useFuncionarios"
import { DetalleFuncionario } from "./DetalleFuncionario"

/** Modal de detalle montado por la ruta hija `:id`. Cierra con navigate(-1) (default de Modal). */
export function FuncionarioModal() {
  const { id } = useParams()
  const { data, isLoading } = useFuncionarioDetalle(id)
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
