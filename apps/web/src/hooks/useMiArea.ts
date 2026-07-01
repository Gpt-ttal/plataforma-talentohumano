import { useQuery } from "@tanstack/react-query"
import type { BucketGestion } from "@pys/shared"
import { apiMiArea } from "../lib/api"

/**
 * Cola de trabajo del área activa del usuario, partida por bucket (por gestionar /
 * gestionados / todos). Se mantiene suspendida mientras `areaId` sea undefined
 * (usuario sin área asignada).
 */
export function useMiArea(
  areaId: string | undefined,
  opciones: { pagina?: number; bucket?: BucketGestion } = {},
) {
  return useQuery({
    queryKey: ["mi-area", areaId, opciones.bucket, opciones.pagina],
    queryFn: () => apiMiArea.listar(areaId!, opciones),
    enabled: !!areaId,
  })
}
