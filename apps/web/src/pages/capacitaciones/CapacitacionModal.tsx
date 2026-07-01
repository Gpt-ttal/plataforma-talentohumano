import { useNavigate, useParams } from "react-router-dom"
import { QRCodeSVG } from "qrcode.react"
import {
  AMBITO_LABEL,
  ESTADO_REGISTRO_BADGE,
  ESTADO_REGISTRO_DOT,
  ESTADO_REGISTRO_LABEL,
  formatFechaHora,
} from "@pys/shared"
import { useCapacitacionDetalle } from "../../hooks/useCapacitaciones"
import { Modal } from "../../components/ui/Modal"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"

const BASE_WEB = import.meta.env.VITE_WEB_URL ?? window.location.origin

/**
 * Modal de detalle de una capacitación: metadatos completos + QR que apunta
 * al formulario público de asistencia (`/asistencia/:token`), lista de
 * asistentes ya registrados y conteo total. El QR es SVG (client-side,
 * sin llamada extra al servidor).
 */
export function CapacitacionModal() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useCapacitacionDetalle(id)

  function cerrar() {
    navigate("..", { relative: "path" })
  }

  return (
    <Modal onClose={cerrar} aria-label="Detalle de capacitación">
      {isLoading || !data ? (
        <div className="p-6">
          <ListaSkeleton filas={4} />
        </div>
      ) : (
        <ContenidoDetalle
          capacitacion={data.capacitacion}
          asistencias={data.asistencias}
          total={data.totalAsistencias}
        />
      )}
    </Modal>
  )
}

import type { Asistencia, Capacitacion } from "@pys/shared"

function ContenidoDetalle({
  capacitacion: c,
  asistencias,
  total,
}: {
  capacitacion: Capacitacion
  asistencias: Asistencia[]
  total: number
}) {
  const urlRegistro = `${BASE_WEB}/asistencia/${c.token}`
  const pill = {
    className: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_REGISTRO_BADGE[c.estadoRegistro]}`,
    dot: ESTADO_REGISTRO_DOT[c.estadoRegistro],
    label: ESTADO_REGISTRO_LABEL[c.estadoRegistro],
  }

  return (
    <div className="divide-y divide-silver-100">
      {/* Cabecera */}
      <div className="space-y-2 px-6 pb-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight text-navy-900">
            {c.titulo}
          </h2>
          <span className={pill.className}>
            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
            {pill.label}
          </span>
        </div>
        <p className="text-xs text-silver-600">
          {AMBITO_LABEL[c.ambito]} · {formatFechaHora(c.iniciaEn)} – {formatFechaHora(c.terminaEn)}
          {c.lugar ? ` · ${c.lugar}` : ""}
          {c.instructor ? ` · ${c.instructor}` : ""}
          {c.horas ? ` · ${c.horas} h` : ""}
        </p>
        {c.descripcion && (
          <p className="text-sm text-silver-600">{c.descripcion}</p>
        )}
      </div>

      {/* QR de asistencia */}
      <div className="px-6 py-5">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
          QR de asistencia
        </p>
        <div className="flex flex-wrap items-start gap-6">
          <div className="rounded-xl border border-silver-200 bg-white p-3 shadow-luxe">
            <QRCodeSVG
              value={urlRegistro}
              size={160}
              bgColor="#ffffff"
              fgColor="#142943"
              level="M"
            />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-silver-600">
              Comparte este código con los asistentes. Al escanearlo acceden
              directamente al formulario de registro — sin necesidad de cuenta.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-silver-200 bg-silver-50 px-3 py-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-silver-600">
                {urlRegistro}
              </span>
              <CopiarButton url={urlRegistro} />
            </div>
            {c.estadoRegistro === "BORRADOR" && (
              <p className="text-xs font-medium text-gold-600">
                El registro aún está en borrador. Ábrelo para que los asistentes
                puedan registrarse.
              </p>
            )}
            {c.estadoRegistro === "CERRADO" && (
              <p className="text-xs font-medium text-estado-info">
                El registro está cerrado. Exporta la lista de asistentes desde
                la fila del evento.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lista de asistentes */}
      <div className="px-6 py-5">
        <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
          Asistentes ({total})
        </p>
        {asistencias.length === 0 ? (
          <p className="text-sm text-silver-500">
            Nadie se ha registrado todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-silver-100">
                  <th className="py-2 pr-4 font-semibold text-silver-600">Nombre</th>
                  <th className="py-2 pr-4 font-semibold text-silver-600">Documento</th>
                  <th className="py-2 pr-4 font-semibold text-silver-600">Dependencia</th>
                  <th className="py-2 font-semibold text-silver-600">Vínculo</th>
                </tr>
              </thead>
              <tbody>
                {asistencias.map((a) => (
                  <tr key={a.id} className="border-b border-silver-50">
                    <td className="py-1.5 pr-4 font-medium text-navy-800">{a.nombre}</td>
                    <td className="py-1.5 pr-4 tabular-nums text-navy-700">{a.documento}</td>
                    <td className="py-1.5 pr-4 text-silver-600">{a.dependencia ?? "—"}</td>
                    <td className="py-1.5 text-silver-600">{a.tipoVinculo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function CopiarButton({ url }: { url: string }) {
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      title="Copiar enlace"
      className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-silver-600 transition hover:bg-silver-200 hover:text-navy-800"
    >
      Copiar
    </button>
  )
}
