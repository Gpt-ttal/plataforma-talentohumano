import { useState } from "react"
import { Link, Outlet, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  diasDeTramite,
  formatFecha,
  formatFechaHora,
  hrefCon,
  parseFiltroArchivo,
  POR_PAGINA_DEFECTO,
} from "@pys/shared"
import type { Funcionario } from "@pys/shared"
import { apiArchivo, ApiError } from "../../lib/api"
import { useArchivo } from "../../hooks/useArchivo"
import { Avatar } from "../../components/ui/Avatar"
import { EstadoGlobalPill } from "../../components/ui/EstadoPill"
import { Buscador } from "../../components/ui/Buscador"
import { Paginacion } from "../../components/ui/Paginacion"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"

const BASE = "/archivo"

/**
 * Archivo institucional — listado de SOLO LECTURA de los trámites cerrados
 * (estado terminal PAZ_Y_SALVO) con su metadata de cierre, para auditoría y
 * consulta histórica de la plataforma de gestión (SA + TH). Filtros server-driven
 * por la URL (búsqueda + rango de fecha de retiro); export CSV del conjunto
 * filtrado. La ruta hija `:id` abre el expediente como modal.
 */
export function ArchivoPage() {
  const [searchParams] = useSearchParams()
  const sp = Object.fromEntries(searchParams)
  const filtro = parseFiltroArchivo(sp)

  const { data, isLoading } = useArchivo({ ...filtro, porPagina: POR_PAGINA_DEFECTO })

  return (
    <div className="space-y-7">
      <PageHeader
        title="Archivo institucional"
        description="Registro histórico de los colaboradores cuyo paz y salvo ya fue registrado. Consulta la metadata del cierre, abre cada expediente o exporta el listado filtrado."
        meta={
          <>
            <span>Corporacion Universitaria Americana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot>Trámites finalizados</HeaderMetaDot>
          </>
        }
        actions={<ExportarCsvButton filtro={filtro} />}
      />

      {/* Controles: búsqueda + rango de fecha de retiro. */}
      <div className="premium-card space-y-3 rounded-xl px-4 py-4">
        <Buscador />
        <RangoRetiro />
      </div>

      {isLoading || !data ? (
        <ListaSkeleton filas={POR_PAGINA_DEFECTO} />
      ) : (
        <div className="space-y-7">
          {data.items.length === 0 ? (
            <EmptyState
              icono="🗂️"
              titulo="Sin trámites archivados"
              mensaje="No hay colaboradores finalizados que coincidan con la búsqueda o el rango de fechas."
            />
          ) : (
            <div className="space-y-2.5">
              {data.items.map((f) => (
                <FilaArchivo key={f.id} f={f} />
              ))}
            </div>
          )}

          <Paginacion
            basePath={BASE}
            params={{
              q: filtro.q,
              retiroDesde: filtro.retiroDesde,
              retiroHasta: filtro.retiroHasta,
            }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}

      {/* Expediente (ruta hija `:id`): se monta encima sin desmontar la lista. */}
      <Outlet />
    </div>
  )
}

/** Botón de descarga del CSV del conjunto filtrado. */
function ExportarCsvButton({
  filtro,
}: {
  filtro: { q?: string; retiroDesde?: string; retiroHasta?: string }
}) {
  const [descargando, setDescargando] = useState(false)

  async function exportar() {
    setDescargando(true)
    try {
      const blob = await apiArchivo.exportCsv(filtro)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "archivo-paz-y-salvo.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "No se pudo exportar el archivo."
      toast.error(msg)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={descargando}
      className="inline-flex items-center gap-2 rounded-lg border border-silver-200 bg-white/85 px-3.5 py-2 text-sm font-semibold text-navy-700 shadow-luxe transition hover:border-gold-300 hover:text-navy-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden>↓</span>
      {descargando ? "Exportando…" : "Exportar CSV"}
    </button>
  )
}

/** Filtro de rango de fecha de retiro (server-driven por la URL). */
function RangoRetiro() {
  const [searchParams, setSearchParams] = useSearchParams()

  function setFecha(clave: "retiroDesde" | "retiroHasta", valor: string) {
    const sp = new URLSearchParams(searchParams)
    if (valor) sp.set(clave, valor)
    else sp.delete(clave)
    sp.delete("pagina") // nuevo filtro → página 1
    setSearchParams(sp, { replace: true })
  }

  const inputCls =
    "rounded-lg border border-silver-200 bg-white/88 px-3 py-2 text-sm text-navy-800 shadow-luxe transition focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-300/45"

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
        Retiro
      </span>
      <label className="flex items-center gap-1.5 text-xs text-silver-600">
        Desde
        <input
          type="date"
          value={searchParams.get("retiroDesde") ?? ""}
          onChange={(e) => setFecha("retiroDesde", e.target.value)}
          className={inputCls}
          aria-label="Fecha de retiro desde"
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-silver-600">
        Hasta
        <input
          type="date"
          value={searchParams.get("retiroHasta") ?? ""}
          onChange={(e) => setFecha("retiroHasta", e.target.value)}
          className={inputCls}
          aria-label="Fecha de retiro hasta"
        />
      </label>
    </div>
  )
}

/** Una fila del archivo: cabecera con resumen + detalle desplegable (solo lectura). */
function FilaArchivo({ f }: { f: Funcionario }) {
  const dias = diasDeTramite(f.fechaRetiro, f.fechaLiquidacion)
  return (
    <FilaDesplegable
      cabecera={
        <span className="flex min-w-0 items-center gap-3">
          <Avatar nombre={f.nombreCompleto} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-navy-900">
              {f.nombreCompleto}
            </span>
            <span className="block text-xs text-silver-600 tabular-nums">
              CC {f.documento} · paz y salvo {formatFecha(f.fechaLiquidacion)}
            </span>
          </span>
          <span className="hidden sm:block">
            <EstadoGlobalPill estado={f.estadoGlobal} />
          </span>
        </span>
      }
    >
      <DetalleResumen f={f} dias={dias} />
    </FilaDesplegable>
  )
}

/** Contenido revelado: metadata del cierre + enlace al expediente. */
function DetalleResumen({ f, dias }: { f: Funcionario; dias: number | null }) {
  return (
    <div className="space-y-4">
      <div className="sm:hidden">
        <EstadoGlobalPill estado={f.estadoGlobal} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
        <Dato etiqueta="Área base" valor={f.areaOrigen} />
        <Dato etiqueta="Cargo" valor={f.cargo} />
        <Dato etiqueta="Fecha de retiro" valor={formatFecha(f.fechaRetiro)} />
        <Dato
          etiqueta="Liquidación generada"
          valor={
            f.fechaLiquidacionGenerada
              ? `${formatFechaHora(f.fechaLiquidacionGenerada)} · ${f.liquidacionGeneradaPor ?? "Talento Humano"}`
              : "—"
          }
        />
        <Dato
          etiqueta="Paz y salvo"
          valor={
            f.fechaLiquidacion
              ? `${formatFechaHora(f.fechaLiquidacion)} · ${f.liquidadoPor ?? "Control Interno"}`
              : "—"
          }
        />
        <Dato
          etiqueta="Días de trámite"
          valor={dias === null ? "—" : `${dias} día${dias === 1 ? "" : "s"}`}
        />
      </dl>
      <Link
        to={f.id}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-gold-600"
      >
        Ver expediente completo <span aria-hidden>→</span>
      </Link>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-silver-600">
        {etiqueta}
      </dt>
      <dd className="mt-0.5 truncate font-medium text-navy-700 tabular-nums">
        {valor}
      </dd>
    </div>
  )
}
