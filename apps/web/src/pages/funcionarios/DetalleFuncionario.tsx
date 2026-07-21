import type { FuncionarioDetalle } from "@pys/shared"
import { formatFecha, formatFechaHora } from "@pys/shared"
import { Avatar } from "../../components/ui/Avatar"
import { EstadoAreaPill, EstadoGlobalPill } from "../../components/ui/EstadoPill"
import { useRole } from "../../hooks/useRole"
import { AreaList } from "./AreaList"
import { GenerarLiquidacionButton } from "./GenerarLiquidacionButton"
import { LiquidarButton } from "./LiquidarButton"

/**
 * Cuerpo del detalle de un funcionario (datos + áreas + historial + acciones).
 * Reutilizable en el modal interceptado y en la página directa /funcionarios/:id.
 *
 * Gating por rol (presentación — el backend aplica las guardas reales). Gestión
 * de Desvinculaciones invirtió los guardas: Control Interno valida el penúltimo
 * hito, Talento Humano cierra oficialmente:
 * - GenerarLiquidacionButton: LISTO_PARA_LIQUIDAR + CI/SA
 * - LiquidarButton: LIQUIDACION_GENERADA + TH/SA
 * - AccionesArea (via AreaList.puedeGestionar): solo SUPERADMIN en el catálogo
 * - DevolverAreaButton (via AreaList.puedeDevolver): CI/SA
 *
 * Token remap legado → Sello:
 * - bg-institucional-light / text-institucional-dark → Avatar component
 * - text-gray-900 → text-navy-900
 * - text-gray-700 → text-navy-700
 * - text-gray-600 → text-navy-600
 * - text-gray-500/400 → text-silver-600 (AA mínimo del Sello)
 * - border-gray-100 → border-silver-100
 * - bg-gray-300 → bg-silver-300
 */
export function DetalleFuncionario({ detalle }: { detalle: FuncionarioDetalle }) {
  const { funcionario: f, aprobaciones, observaciones } = detalle
  const { tieneRol, esSuperadmin } = useRole()

  const total = aprobaciones.length
  const resueltasOk = aprobaciones.filter(
    (a) => a.estado === "APROBADO" || a.estado === "NO_APLICA",
  ).length
  const hayRechazo = aprobaciones.some((a) => a.estado === "NO_APROBADO")
  const areaNombrePorId = new Map(aprobaciones.map((a) => [a.areaId, a.areaNombre]))

  const mostrarGenerar =
    f.estadoGlobal === "LISTO_PARA_LIQUIDAR" &&
    tieneRol("CONTROL_INTERNO", "SUPERADMIN")

  const mostrarLiquidar =
    f.estadoGlobal === "LIQUIDACION_GENERADA" &&
    tieneRol("TALENTO_HUMANO", "SUPERADMIN")

  const puedeDevolver = tieneRol("CONTROL_INTERNO", "SUPERADMIN")

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <section className="rounded-xl border border-silver-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar nombre={f.nombreCompleto} size="lg" />
            <div>
              <h1 className="text-xl font-bold text-navy-900">{f.nombreCompleto}</h1>
              <p className="text-sm text-silver-600">
                CC {f.documento} · {f.cargo}
              </p>
              <p className="text-sm text-silver-600">{f.areaOrigen}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <EstadoGlobalPill estado={f.estadoGlobal} />
            <span className="tabular-nums text-xs text-silver-600">
              {resueltasOk} / {total} áreas al día
            </span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-silver-100 pt-5 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-silver-600">
              Fecha de retiro
            </dt>
            <dd className="mt-0.5 font-medium text-navy-700">
              {formatFecha(f.fechaRetiro)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-silver-600">
              Liquidación generada
            </dt>
            <dd className="mt-0.5 font-medium text-navy-700">
              {f.fechaLiquidacionGenerada ? (
                <>
                  {formatFechaHora(f.fechaLiquidacionGenerada)}
                  <span className="block text-xs font-normal text-silver-600">
                    {f.liquidacionGeneradaPor ?? "Talento Humano"}
                  </span>
                </>
              ) : (
                "Sin generar"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-silver-600">
              Paz y salvo
            </dt>
            <dd className="mt-0.5 font-medium text-navy-700">
              {f.fechaLiquidacion ? (
                <>
                  {formatFechaHora(f.fechaLiquidacion)}
                  <span className="block text-xs font-normal text-silver-600">
                    {f.liquidadoPor ?? "Control Interno"}
                  </span>
                </>
              ) : (
                "Sin registrar"
              )}
            </dd>
          </div>
          <div className="flex items-end">
            {mostrarGenerar && (
              <GenerarLiquidacionButton funcionarioId={f.id} />
            )}
            {mostrarLiquidar && (
              <LiquidarButton funcionarioId={f.id} />
            )}
            {f.estadoGlobal === "PAZ_Y_SALVO" && (
              <span className="text-sm font-medium text-estado-paz">
                ✓ A paz y salvo
              </span>
            )}
          </div>
        </dl>

        {f.estadoGlobal === "LIQUIDACION_GENERADA" && (
          <div className="mt-4 rounded-lg border border-navy-200 bg-navy-50 px-4 py-2.5 text-sm text-navy-700">
            Talento Humano ya <strong>generó la liquidación</strong> y avisó a
            Control Interno. Falta el <strong>cierre (paz y salvo)</strong> por parte
            de Control Interno.
          </div>
        )}

        {hayRechazo && (
          <div className="mt-4 rounded-lg border border-estado-rechazo/30 bg-red-50 px-4 py-2.5 text-sm text-estado-rechazo">
            Hay al menos un área <strong>rechazada</strong>. El funcionario no puede
            quedar a paz y salvo hasta resolverla.
          </div>
        )}
      </section>

      {/* Áreas de visto bueno */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-navy-700">
          Áreas de visto bueno
        </h2>
        <AreaList
          funcionarioId={f.id}
          aprobaciones={aprobaciones}
          puedeGestionar={esSuperadmin}
          puedeDevolver={puedeDevolver}
        />
      </section>

      {/* Historial de observaciones */}
      <section className="rounded-xl border border-silver-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-navy-700">
          Historial de observaciones
        </h2>
        {observaciones.length === 0 ? (
          <p className="mt-3 text-sm text-silver-600">Sin observaciones registradas.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {observaciones.map((o) => (
              <li key={o.id} className="flex gap-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-silver-300" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-navy-700">
                      {areaNombrePorId.get(o.areaId) ?? "Área"}
                    </span>
                    <EstadoAreaPill estado={o.estado} />
                    <span className="text-xs text-silver-600">
                      {formatFechaHora(o.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-navy-600">{o.texto}</p>
                  <p className="mt-0.5 text-xs text-silver-600">— {o.autor}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
