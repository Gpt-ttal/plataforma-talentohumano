import { useQuery } from "@tanstack/react-query"
import { apiMiArea } from "../lib/api"

/**
 * Cola de trabajo del área activa del usuario. Se mantiene suspendido
 * mientras `areaId` sea undefined (usuario sin área asignada).
 */
export function useMiArea(areaId: string | undefined, pagina?: number) {
  return useQuery({
    queryKey: ["mi-area", areaId, pagina],
    queryFn: () => apiMiArea.listar(areaId!, pagina),
    enabled: !!areaId,
  })
}
