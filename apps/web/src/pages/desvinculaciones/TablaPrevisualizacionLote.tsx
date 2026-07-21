import type { LotePrevisualizacion } from "@pys/shared"
import { formatFecha } from "@pys/shared"
import { PillFilaLoteEstado } from "./PillFilaLoteEstado"

/**
 * Tabla de previsualización de un lote: cada fila VALIDA es seleccionable
 * (checkbox) para la confirmación parcial; el resto se muestra de solo
 * lectura con su motivo. Filas que ni siquiera se pudieron leer del Excel
 * (`erroresParseo`) van aparte, nunca se mezclan con las filas persistidas.
 */
export function TablaPrevisualizacionLote({
  lote,
  seleccionadas,
  onToggle,
  onToggleTodas,
  disabled = false,
}: {
  lote: LotePrevisualizacion
  seleccionadas: Set<string>
  onToggle: (filaId: string) => void
  onToggleTodas: (marcar: boolean) => void
  disabled?: boolean
}) {
  const validas = lote.filas.filter((f) => f.estado === "VALIDA")
  const todasMarcadas = validas.length > 0 && validas.every((f) => seleccionadas.has(f.id))

  return (
    <div className="space-y-4">
      {lote.erroresParseo.length > 0 && (
        <div className="rounded-xl border border-estado-rechazo/30 bg-red-50 p-4">
          <p className="text-sm font-semibold text-estado-rechazo">
            {lote.erroresParseo.length} fila
            {lote.erroresParseo.length === 1 ? "" : "s"} del Excel no se pudo leer
          </p>
          <ul className="mt-2 space-y-1 text-xs text-estado-rechazo">
            {lote.erroresParseo.map((e) => (
              <li key={e.numeroFila}>
                Fila {e.numeroFila}: {e.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-silver-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-silver-200 bg-silver-50 text-left text-xs uppercase tracking-wide text-silver-600">
            <tr>
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={todasMarcadas}
                  disabled={disabled || validas.length === 0}
                  onChange={(e) => onToggleTodas(e.target.checked)}
                  aria-label="Seleccionar todas las filas válidas"
                />
              </th>
              <th className="px-3 py-2.5">Fila</th>
              <th className="px-3 py-2.5">Documento</th>
              <th className="px-3 py-2.5">Nombre</th>
              <th className="px-3 py-2.5">Fecha retiro</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {lote.filas.map((f) => (
              <tr key={f.id} className={f.estado === "VALIDA" ? "" : "opacity-70"}>
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(f.id)}
                    disabled={disabled || f.estado !== "VALIDA"}
                    onChange={() => onToggle(f.id)}
                    aria-label={`Seleccionar fila ${f.numeroFila}`}
                  />
                </td>
                <td className="px-3 py-2.5 tabular-nums text-silver-600">{f.numeroFila}</td>
                <td className="px-3 py-2.5 tabular-nums text-navy-800">{f.documento}</td>
                <td className="px-3 py-2.5 text-navy-800">{f.nombreCompleto}</td>
                <td className="px-3 py-2.5 tabular-nums text-navy-700">
                  {formatFecha(f.fechaRetiro)}
                </td>
                <td className="px-3 py-2.5">
                  <PillFilaLoteEstado estado={f.estado} />
                </td>
                <td className="px-3 py-2.5 text-xs text-silver-600">{f.mensajeError ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
