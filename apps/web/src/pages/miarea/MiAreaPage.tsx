import { Link, useSearchParams } from "react-router-dom"
import { hrefCon, formatFecha, rutaOficinaPorRol } from "@pys/shared"
import type { AreaVistoBueno, BucketGestion, FilaGestionArea } from "@pys/shared"
import { useRole } from "../../hooks/useRole"
import { useAreas } from "../../hooks/useAreas"
import { useMiArea } from "../../hooks/useMiArea"
import { Avatar } from "../../components/ui/Avatar"
import { ChipFiltro } from "../../components/ui/ChipFiltro"
import { EstadoAreaPill } from "../../components/ui/EstadoPill"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Paginacion } from "../../components/ui/Paginacion"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { Icon } from "../../components/ui/dash/Icon"
import { AreaIcon } from "../../components/ui/AreaIcon"
import { SpotBandejaAlDia } from "../../components/ui/spot/Spots"
import { AccionesArea } from "../funcionarios/AccionesArea"

const BASE = "/paz-y-salvo/mi-area"

/**
 * Cola de visto bueno de una dependencia. El usuario AREA ve directo la cola de su
 * propia área; el SUPERADMIN elige el área con chips (`?area=<orden>`). Las acciones
 * de aprobación las autoriza el backend (`areaPermitida`); aquí solo se reflejan.
 */
export function MiAreaPage() {
  const { areaId, esSuperadmin, rol } = useRole()
  const { data: areas } = useAreas()
  const [searchParams] = useSearchParams()

  const ordenSel = searchParams.get("area") ?? undefined
  const pagina = Number(searchParams.get("pagina")) || undefined

  // Corte por bucket (?bucket=). "todos" es el estado limpio (sin query param).
  const bucketParam = searchParams.get("bucket")
  const bucket: BucketGestion | undefined =
    bucketParam === "pendientes" || bucketParam === "gestionados" ? bucketParam : undefined
  const bucketActivo: BucketGestion = bucket ?? "todos"

  // Selección del área activa según el rol.
  const area: AreaVistoBueno | undefined = esSuperadmin
    ? ordenSel
      ? areas?.find((a) => String(a.orden) === ordenSel)
      : undefined
    : areas?.find((a) => a.id === areaId)

  // Un AREA activo sin `areaId` es un estado inválido (el backend lo impide); lo
  // reflejamos con un mensaje propio en vez del selector pensado para el SA.
  const sinAreaAsignada = !esSuperadmin && !areaId

  const { data, isLoading, isError } = useMiArea(area?.id, { pagina, bucket })

  // Parámetros de URL a preservar al cambiar de página o bucket.
  const paramsArea = esSuperadmin && area ? { area: area.orden } : {}

  return (
    <div className="space-y-7">
      <PageHeader
        title={area ? `Bandeja de ${area.nombre}` : "Mi área"}
        description="Aprueba o rechaza el visto bueno de cada colaborador para esta dependencia. Despliega una fila para gestionarla."
        meta={
          <>
            <span>Cola de visto bueno</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">Gestión por dependencia</HeaderMetaDot>
          </>
        }
      />

      {/* Selector de área (solo SUPERADMIN supervisa cualquier dependencia). */}
      {esSuperadmin && areas && (
        <div className="premium-card space-y-3 rounded-xl px-4 py-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
            Áreas
          </span>
          <div className="flex flex-wrap gap-1.5">
            {areas.map((a) => {
              const activo = area?.id === a.id
              return (
                <Link
                  key={a.id}
                  to={hrefCon(BASE, { area: a.orden })}
                  aria-pressed={activo}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    activo
                      ? "bg-navy-deep text-white shadow-luxe ring-1 ring-gold/45"
                      : "bg-white/82 text-silver-600 ring-1 ring-silver-200 hover:bg-white hover:text-navy-800 hover:ring-gold-300"
                  }`}
                >
                  <AreaIcon nombre={a.nombre} variant="bare" />
                  {a.nombre}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Sin área activa: el AREA sin asignar ve un aviso; el SA elige dependencia. */}
      {!area ? (
        sinAreaAsignada ? (
          <EmptyState
            icono={<Icon name="lock" className="h-6 w-6" />}
            titulo="Sin área asignada"
            mensaje="Tu cuenta aún no tiene un área asignada. Contacta al administrador para que te habilite una dependencia."
          />
        ) : (
          <EmptyState
            icono={<Icon name="grid" className="h-6 w-6" />}
            titulo="Elige un área"
            mensaje="Selecciona una dependencia para ver y gestionar su cola de visto bueno."
          />
        )
      ) : isError ? (
        <div className="rounded-xl border border-estado-rechazo/30 bg-red-50 px-4 py-3 text-sm text-estado-rechazo">
          No se pudo cargar la cola de esta dependencia. Vuelve a intentarlo.
        </div>
      ) : isLoading || !data ? (
        <ListaSkeleton filas={6} />
      ) : (
        <div className="space-y-7">
          {/* Corte de la cola: lo que falta gestionar vs. lo ya gestionado, con
              contadores sobre el total del área (independientes de la página). */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
              Bandeja
            </span>
            <ChipFiltro
              label="Por gestionar"
              activo={bucketActivo === "pendientes"}
              contador={data.conteos.pendientes}
              href={hrefCon(BASE, { ...paramsArea, bucket: "pendientes" })}
            />
            <ChipFiltro
              label="Gestionados"
              activo={bucketActivo === "gestionados"}
              contador={data.conteos.gestionados}
              href={hrefCon(BASE, { ...paramsArea, bucket: "gestionados" })}
            />
            <ChipFiltro
              label="Todos"
              activo={bucketActivo === "todos"}
              contador={data.conteos.total}
              href={hrefCon(BASE, paramsArea)}
            />
          </div>

          {data.items.length === 0 ? (
            <EmptyState
              ilustracion={<SpotBandejaAlDia />}
              titulo="Nada en este corte"
              mensaje="No hay colaboradores en este filtro de la cola."
            />
          ) : (
            <div className="space-y-2.5">
              {data.items.map((fila) => (
                <FilaMiArea
                  key={fila.funcionario.id}
                  fila={fila}
                  areaId={area.id}
                  esSuperadmin={esSuperadmin}
                  oficinaSuperadmin={rol ? rutaOficinaPorRol(rol) : undefined}
                />
              ))}
            </div>
          )}

          <Paginacion
            basePath={BASE}
            params={{ ...paramsArea, bucket }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}
    </div>
  )
}

/** Una fila de la cola: cabecera con el colaborador + acciones de área al desplegar. */
function FilaMiArea({
  fila,
  areaId,
  esSuperadmin,
  oficinaSuperadmin,
}: {
  fila: FilaGestionArea
  areaId: string
  esSuperadmin: boolean
  oficinaSuperadmin?: string
}) {
  const { funcionario: f, estado } = fila
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
            <EstadoAreaPill estado={estado} />
          </span>
        </span>
      }
    >
      <div className="space-y-4">
        <div className="sm:hidden">
          <EstadoAreaPill estado={estado} />
        </div>
        <AccionesArea funcionarioId={f.id} areaId={areaId} estado={estado} />
        {/* La ficha completa (todas las áreas + observaciones) es vista de
            supervisión: el backend (`obtenerDetalle`) solo la sirve a SA/TH/CI.
            El usuario AREA gestiona su visto bueno aquí mismo, sin la ficha. */}
        {esSuperadmin && oficinaSuperadmin && (
          <Link
            to={`${oficinaSuperadmin}/${f.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 transition-colors hover:text-gold-600"
          >
            Ver ficha completa <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </FilaDesplegable>
  )
}
