import { Link, Outlet, useSearchParams } from "react-router-dom"
import {
  hrefCon,
  parseFiltroFuncionarios,
  POR_PAGINA_DEFECTO,
  ESTADOS_GLOBAL,
  ESTADO_GLOBAL_LABEL,
  formatFecha,
  formatFechaHora,
} from "@pys/shared"
import type {
  EstadoGlobal,
  Funcionario,
  VistaSupervision,
} from "@pys/shared"
import { useFuncionarios } from "../../hooks/useFuncionarios"
import { useRole } from "../../hooks/useRole"
import { Avatar } from "../../components/ui/Avatar"
import { EstadoGlobalPill } from "../../components/ui/EstadoPill"
import { Segmented } from "../../components/ui/Segmented"
import { Buscador } from "../../components/ui/Buscador"
import { ChipFiltro } from "../../components/ui/ChipFiltro"
import { Paginacion } from "../../components/ui/Paginacion"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { GenerarLiquidacionButton } from "./GenerarLiquidacionButton"
import { LiquidarButton } from "./LiquidarButton"

// Ruta dedicada (oficina) de cada vista de supervisión. Fuente única para el
// Segmented del superadmin; cada wrapper de página pasa su propia ruta como basePath.
const RUTA_POR_VISTA: Record<VistaSupervision, string> = {
  todos: "/paz-y-salvo/funcionarios",
  th: "/paz-y-salvo/talento-humano",
  ci: "/paz-y-salvo/control-interno",
}

/** Texto y estado accionable de cada vista de supervisión. */
const VISTA_CFG: Record<
  VistaSupervision,
  {
    titulo: string
    intro: string
    estadoAccionable: EstadoGlobal | null
    bandeja: string
  }
> = {
  todos: {
    titulo: "Funcionarios",
    intro:
      "Estado global consolidado de cada colaborador en proceso de retiro. Despliega una fila para ver su detalle.",
    estadoAccionable: null,
    bandeja: "",
  },
  th: {
    titulo: "Talento Humano",
    intro:
      "Genera la liquidación de los colaboradores cuyas áreas ya dieron el visto bueno; al hacerlo, Control Interno recibe el aviso.",
    estadoAccionable: "LISTO_PARA_LIQUIDAR",
    bandeja: "Listos para generar liquidación",
  },
  ci: {
    titulo: "Control Interno",
    intro:
      "Finaliza el trámite: registra el paz y salvo (estado terminal) de los colaboradores cuya liquidación ya generó Talento Humano. Este cierre es el último paso del proceso.",
    estadoAccionable: "LIQUIDACION_GENERADA",
    bandeja: "Esperan tu cierre (paz y salvo)",
  },
}

/**
 * Catálogo de funcionarios de una oficina. La `vista` y la `basePath` llegan por
 * prop (cada ruta dedicada monta su wrapper): SA supervisa el catálogo completo en
 * `/paz-y-salvo/funcionarios`, TH y CI tienen su propia página. Los filtros vienen de
 * la URL (`useSearchParams`) y los datos de `useFuncionarios`. La ruta hija `:id` se
 * monta vía `<Outlet/>` como modal encima.
 */
export function CatalogoFuncionarios({
  vista,
  basePath,
}: {
  vista: VistaSupervision
  basePath: string
}) {
  const { esSuperadmin } = useRole()
  const [searchParams] = useSearchParams()

  const sp = Object.fromEntries(searchParams)
  const cfg = VISTA_CFG[vista]
  const filtro = parseFiltroFuncionarios(sp)

  // Catálogo paginado de la vista actual.
  const { data, isLoading } = useFuncionarios({
    ...filtro,
    porPagina: POR_PAGINA_DEFECTO,
  })

  // Conteo de la bandeja (todos los accionables, no solo la página visible). Solo
  // se dispara cuando la vista tiene un estado accionable; en "todos" no hay
  // bandeja, así que la query queda deshabilitada (sin HTTP inútil).
  const { data: dataBandeja } = useFuncionarios(
    { estado: cfg.estadoAccionable ?? undefined, porPagina: 1 },
    { enabled: !!cfg.estadoAccionable },
  )
  const bandeja = cfg.estadoAccionable ? (dataBandeja?.total ?? 0) : 0

  return (
    <div className="space-y-7">
      <PageHeader
        title={cfg.titulo}
        description={cfg.intro}
        meta={
          <>
            <span>Corporacion Universitaria Americana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot>Catalogo server-driven</HeaderMetaDot>
          </>
        }
      />

      {/* Toggle de supervisión: solo el superadmin alterna entre oficinas; cada
          opción navega a la ruta dedicada preservando búsqueda y filtro. */}
      {esSuperadmin && (
        <Segmented
          etiqueta="Vista de supervisión"
          activo={vista}
          opciones={[
            { value: "todos", label: "Todo", href: hrefCon(RUTA_POR_VISTA.todos, { q: filtro.q, estado: filtro.estado }) },
            { value: "th", label: "Talento Humano", href: hrefCon(RUTA_POR_VISTA.th, { q: filtro.q, estado: filtro.estado }) },
            { value: "ci", label: "Control Interno", href: hrefCon(RUTA_POR_VISTA.ci, { q: filtro.q, estado: filtro.estado }) },
          ]}
        />
      )}

      {/* Bandeja destacada de la vista de rol. */}
      {cfg.estadoAccionable && (
        <Bandeja cantidad={bandeja} etiqueta={cfg.bandeja} vista={vista} />
      )}

      {/* Controles: búsqueda + filtros de estado. */}
      <div className="premium-card space-y-3 rounded-xl px-4 py-4">
        <Buscador />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">Estado</span>
          <ChipFiltro
            label="Todos"
            activo={!filtro.estado}
            href={hrefCon(basePath, { q: filtro.q })}
          />
          {ESTADOS_GLOBAL.map((e) => (
            <ChipFiltro
              key={e}
              label={ESTADO_GLOBAL_LABEL[e]}
              activo={filtro.estado === e}
              href={hrefCon(basePath, { q: filtro.q, estado: e })}
            />
          ))}
        </div>
      </div>

      {/* Catálogo paginado con acordeón. Mientras carga se muestra el skeleton
          estructural sin mover los controles de arriba. */}
      {isLoading || !data ? (
        <ListaSkeleton filas={POR_PAGINA_DEFECTO} />
      ) : (
        <div className="space-y-7">
          {data.items.length === 0 ? (
            <EmptyState
              ilustracion={<SpotSinResultados />}
              titulo="Sin resultados"
              mensaje="No hay colaboradores que coincidan con la búsqueda o el filtro actual."
            />
          ) : (
            <div className="space-y-2.5">
              {data.items.map((f) => (
                <FilaCatalogo key={f.id} f={f} vista={vista} />
              ))}
            </div>
          )}

          <Paginacion
            basePath={basePath}
            params={{ q: filtro.q, estado: filtro.estado }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}

      {/* Modal de detalle (ruta hija `:id`): se monta encima sin desmontar la lista. */}
      <Outlet />
    </div>
  )
}

/** Una fila del catálogo: cabecera con resumen + detalle desplegable. */
function FilaCatalogo({ f, vista }: { f: Funcionario; vista: VistaSupervision }) {
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
              CC {f.documento} · retiro {formatFecha(f.fechaRetiro)}
            </span>
          </span>
          <span className="hidden sm:block">
            <EstadoGlobalPill estado={f.estadoGlobal} />
          </span>
        </span>
      }
      acciones={<AccionRol f={f} vista={vista} />}
    >
      <DetalleResumen f={f} />
    </FilaDesplegable>
  )
}

/** Acción de rol disponible en la fila, solo en el estado que le corresponde. */
function AccionRol({ f, vista }: { f: Funcionario; vista: VistaSupervision }) {
  if (vista === "th" && f.estadoGlobal === "LISTO_PARA_LIQUIDAR") {
    return <GenerarLiquidacionButton funcionarioId={f.id} compact />
  }
  if (vista === "ci" && f.estadoGlobal === "LIQUIDACION_GENERADA") {
    return <LiquidarButton funcionarioId={f.id} compact />
  }
  return null
}

/** Contenido revelado al desplegar: metadatos + enlace a la ficha (modal). */
function DetalleResumen({ f }: { f: Funcionario }) {
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
              : "Sin generar"
          }
        />
        <Dato
          etiqueta="Paz y salvo"
          valor={
            f.fechaLiquidacion
              ? `${formatFechaHora(f.fechaLiquidacion)} · ${f.liquidadoPor ?? "Control Interno"}`
              : "Sin registrar"
          }
        />
      </dl>
      {/* Enlace relativo: cae en la ruta hija `:id` y abre el modal sin desmontar la lista. */}
      <Link
        to={f.id}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-gold-600"
      >
        Ver ficha completa <span aria-hidden>→</span>
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
      <dd className="mt-0.5 truncate font-medium text-navy-700">{valor}</dd>
    </div>
  )
}

/** Resumen "bandeja": cuántos colaboradores esperan la acción del rol. */
function Bandeja({
  cantidad,
  etiqueta,
  vista,
}: {
  cantidad: number
  etiqueta: string
  vista: VistaSupervision
}) {
  const vacia = cantidad === 0
  const acento =
    vista === "th"
      ? "from-gold-50 to-white ring-gold-300/60"
      : "from-estado-infoBg to-white ring-estado-info/40"
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl bg-gradient-to-r ${acento} px-5 py-4 shadow-luxe ring-1`}
    >
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold tabular-nums ${
          vacia
            ? "bg-silver-100 text-silver-600"
            : vista === "th"
              ? "bg-gold-sheen text-navy-900"
              : "bg-navy-deep text-white"
        }`}
      >
        {cantidad}
      </span>
      <div>
        <p className="text-sm font-semibold text-navy-900">{etiqueta}</p>
        <p className="text-xs text-silver-600">
          {vacia
            ? "No hay nada pendiente por ahora."
            : `${cantidad} colaborador${cantidad === 1 ? "" : "es"} esperan tu acción.`}
        </p>
      </div>
    </div>
  )
}
