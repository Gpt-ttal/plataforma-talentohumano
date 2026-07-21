import { useState } from "react"
import { toast } from "sonner"
import type { LotePrevisualizacion } from "@pys/shared"
import { useImportarDesvinculaciones, useConfirmarImportacion } from "../../hooks/useDesvinculaciones"
import { ApiError } from "../../lib/api"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { DropzoneArchivo } from "./DropzoneArchivo"
import { TablaPrevisualizacionLote } from "./TablaPrevisualizacionLote"

/**
 * Importación masiva de desvinculaciones: sube un Excel → previsualiza cada
 * fila validada contra la BD → confirma (parcial o total) las filas VALIDA
 * seleccionadas. Cada fila confirmada abre un trámite nuevo por el mismo
 * puente que "Finalizar contrato" individual — irreversible, de ahí la
 * previsualización obligatoria antes de confirmar. Solo SA/TH (guarda de ruta).
 */
export function ImportacionPage() {
  const importar = useImportarDesvinculaciones()
  const confirmar = useConfirmarImportacion()
  const [lote, setLote] = useState<LotePrevisualizacion | null>(null)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set())

  async function onArchivo(archivo: File) {
    setLote(null)
    setSeleccionadas(new Set())
    try {
      const resultado = await importar.mutateAsync(archivo)
      setLote(resultado)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo leer el archivo.")
    }
  }

  function toggle(filaId: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(filaId)) next.delete(filaId)
      else next.add(filaId)
      return next
    })
  }

  function toggleTodas(marcar: boolean) {
    if (!lote) return
    setSeleccionadas(
      marcar ? new Set(lote.filas.filter((f) => f.estado === "VALIDA").map((f) => f.id)) : new Set(),
    )
  }

  async function onConfirmar() {
    if (!lote || seleccionadas.size === 0) return
    try {
      const resultado = await confirmar.mutateAsync({
        loteId: lote.id,
        filaIds: [...seleccionadas],
      })
      setLote(resultado.lote)
      setSeleccionadas(new Set())
      if (resultado.fallidas.length > 0) {
        toast.warning(
          `${resultado.confirmadas} confirmada${resultado.confirmadas === 1 ? "" : "s"}, ${resultado.fallidas.length} no se pudo confirmar.`,
        )
      } else {
        toast.success(
          `${resultado.confirmadas} colaborador${resultado.confirmadas === 1 ? "" : "es"} pasó a trámite de desvinculación.`,
        )
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo confirmar la importación.")
    }
  }

  const validasSeleccionables = lote?.filas.filter((f) => f.estado === "VALIDA").length ?? 0
  const confirmando = confirmar.isPending

  return (
    <div className="space-y-7">
      <PageHeader
        title="Importación masiva"
        description="Sube un Excel con varias desvinculaciones a la vez, revisa cada fila y confirma solo las que estén listas. Nunca se abre un trámite sin tu confirmación explícita."
        meta={
          <>
            <span>Corporacion Universitaria Americana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot>Gestión de Desvinculaciones</HeaderMetaDot>
          </>
        }
      />

      <div className="premium-card space-y-4 rounded-xl px-4 py-4">
        <DropzoneArchivo onArchivo={onArchivo} disabled={importar.isPending} />
        {importar.isPending && (
          <p className="text-sm text-silver-600">Leyendo y validando el archivo…</p>
        )}
      </div>

      {lote && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-silver-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-navy-900">{lote.nombreArchivo}</p>
              <p className="text-xs text-silver-600 tabular-nums">
                {lote.totalFilas} filas · {lote.filasConfirmadas} confirmadas
              </p>
            </div>
            <button
              type="button"
              disabled={seleccionadas.size === 0 || confirmando}
              onClick={() => void onConfirmar()}
              className="inline-flex items-center gap-2 rounded-lg bg-gold-sheen px-4 py-2 text-sm font-semibold text-navy-900 shadow-luxe ring-1 ring-gold-600/30 transition-all duration-200 hover:shadow-gold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirmando
                ? "Confirmando…"
                : `Confirmar ${seleccionadas.size} de ${validasSeleccionables} válida${validasSeleccionables === 1 ? "" : "s"}`}
            </button>
          </div>

          <TablaPrevisualizacionLote
            lote={lote}
            seleccionadas={seleccionadas}
            onToggle={toggle}
            onToggleTodas={toggleTodas}
            disabled={confirmando}
          />
        </div>
      )}
    </div>
  )
}
