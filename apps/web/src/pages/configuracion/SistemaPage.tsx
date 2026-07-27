import { useQuery } from "@tanstack/react-query"
import { api } from "../../lib/api"
import { Panel } from "../../components/ui/dash/primitives"
import { InfoRow, LoadingPanel } from "./ui"

/**
 * Sistema — estado operativo del servicio. Sondea `GET /api/health` cada 30 s (el
 * endpoint va antes del rate-limit en el backend, así que el sondeo no consume su
 * presupuesto). Reemplaza el `SystemSettings` de SIGAF adaptado a este backend.
 */
export function SistemaPage() {
  const salud = useQuery({
    queryKey: ["sistema", "health"],
    queryFn: () => api.get<{ ok: boolean }>("/health"),
    refetchInterval: 30_000,
    retry: false,
  })

  const enLinea = salud.data?.ok === true
  const entorno = import.meta.env.MODE === "production" ? "Producción" : "Desarrollo"

  if (salud.isLoading) return <LoadingPanel filas={4} />

  return (
    <div className="space-y-6">
      <Panel
        icon="server"
        title="Estado del servicio"
        right={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
              enLinea
                ? "bg-estado-okBg text-estado-ok ring-estado-ok/25"
                : "bg-estado-rechazoBg text-estado-rechazo ring-estado-rechazo/25"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                enLinea ? "bg-estado-ok" : "bg-estado-rechazo"
              }`}
            />
            {enLinea ? "En línea" : "Sin respuesta"}
          </span>
        }
      >
        <div className="space-y-0">
          <InfoRow
            label="API"
            value={enLinea ? "Respondiendo" : "No disponible"}
          />
          <InfoRow label="Entorno" value={entorno} />
          <InfoRow label="Base de datos" value="Supabase · PostgreSQL 17" />
          <InfoRow
            label="Último sondeo"
            value={
              salud.dataUpdatedAt
                ? new Date(salud.dataUpdatedAt).toLocaleTimeString("es-CO")
                : "—"
            }
            mono
          />
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          El estado se actualiza automáticamente cada 30 segundos.
        </p>
      </Panel>
    </div>
  )
}
