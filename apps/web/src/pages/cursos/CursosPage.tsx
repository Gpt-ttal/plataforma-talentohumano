import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  AMBITO_LABEL,
  ambitosVisibles,
  ESTADO_REGISTRO_BADGE,
  ESTADO_REGISTRO_DOT,
  ESTADO_REGISTRO_LABEL,
  POR_PAGINA_DEFECTO,
} from "@pys/shared"
import type { AmbitoCapacitacion, Curso, EstadoRegistro } from "@pys/shared"
import { useCursos } from "../../hooks/useCursos"
import { useRole } from "../../hooks/useRole"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Buscador } from "../../components/ui/Buscador"
import { Paginacion } from "../../components/ui/Paginacion"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { Icon } from "../../components/ui/dash/Icon"
import { NuevoCursoModal } from "./NuevoCursoModal"

const BASE = "/cursos"

/**
 * Listado de Cursos — gestión (TH · SST · SA). Filtra por rol en el backend
 * (TH → TH, SST → SST, SA → ambos). Cada fila es un `Link` a una página
 * DEDICADA `/cursos/:id` (no un modal — decisión de la Fase 6, ver
 * CursoDetallePage.tsx en la pieza hermana de esta fase).
 */
export function CursosPage() {
  const { rol } = useRole()
  const [searchParams] = useSearchParams()
  const [crearAbierto, setCrearAbierto] = useState(false)

  const q = searchParams.get("q") ?? undefined
  const estado = (searchParams.get("estado") as EstadoRegistro | null) ?? undefined
  const ambito = (searchParams.get("ambito") as AmbitoCapacitacion | null) ?? undefined
  const pagina = searchParams.get("pagina") ? Number(searchParams.get("pagina")) : undefined

  const { data, isLoading, isError } = useCursos({
    q,
    estado,
    ambito,
    pagina,
    porPagina: POR_PAGINA_DEFECTO,
  })

  const rolesVisibles = rol ? ambitosVisibles(rol) : []
  const mostrarFiltroAmbito = rolesVisibles.length > 1

  return (
    <div className="space-y-7">
      <PageHeader
        title="Cursos"
        description="Contenido auto-guiado que un funcionario toma sin login, identificándose por cédula. Crea módulos y lecciones, publica el curso y sigue el progreso de los inscritos en vivo."
        meta={
          <>
            <span>Gestión Humana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">Formación y desarrollo</HeaderMetaDot>
          </>
        }
        actions={
          rol && (
            <button
              type="button"
              onClick={() => setCrearAbierto(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold-400"
            >
              <Icon name="plus" className="h-4 w-4" />
              Nuevo curso
            </button>
          )
        }
      />

      {crearAbierto && rol && (
        <NuevoCursoModal rol={rol} onClose={() => setCrearAbierto(false)} />
      )}

      <div className="premium-card flex flex-wrap items-end gap-3 rounded-xl px-4 py-4">
        <div className="flex-1">
          <Buscador placeholder="Buscar por título…" />
        </div>
        {mostrarFiltroAmbito && <FiltroAmbito ambito={ambito} ambitos={rolesVisibles} />}
        <FiltroEstado estado={estado} />
      </div>

      {isLoading ? (
        <ListaSkeleton filas={3} />
      ) : isError ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudieron cargar los cursos"
          mensaje="Hubo un problema al consultar los cursos. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          ilustracion={<SpotSinResultados />}
          titulo="Sin cursos"
          mensaje="No hay cursos que coincidan con la búsqueda o los filtros. Crea uno arriba."
        />
      ) : (
        <div className="space-y-7">
          <div className="space-y-2.5">
            {data.items.map((c) => (
              <FilaCurso key={c.id} curso={c} />
            ))}
          </div>
          <Paginacion
            basePath={BASE}
            params={{ q, estado, ambito }}
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
          />
        </div>
      )}
    </div>
  )
}

// ── Filtros server-driven (mirror exacto de CapacitacionesPage.tsx) ────────

function FiltroEstado({ estado }: { estado: EstadoRegistro | undefined }) {
  const [, setSearchParams] = useSearchParams()

  const estados: Array<EstadoRegistro | "todos"> = ["todos", "BORRADOR", "ABIERTO", "CERRADO"]

  function cambiar(val: EstadoRegistro | "todos") {
    setSearchParams(
      (sp) => {
        const next = new URLSearchParams(sp)
        if (val === "todos") next.delete("estado")
        else next.set("estado", val)
        next.delete("pagina")
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {estados.map((e) => {
        const activo = e === "todos" ? !estado : estado === e
        return (
          <button
            key={e}
            type="button"
            onClick={() => cambiar(e as EstadoRegistro | "todos")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activo
                ? "bg-navy-deep text-white shadow-luxe"
                : "bg-silver-100 text-silver-600 hover:bg-silver-200"
            }`}
          >
            {e === "todos" ? "Todos" : ESTADO_REGISTRO_LABEL[e as EstadoRegistro]}
          </button>
        )
      })}
    </div>
  )
}

function FiltroAmbito({
  ambito,
  ambitos,
}: {
  ambito: AmbitoCapacitacion | undefined
  ambitos: AmbitoCapacitacion[]
}) {
  const [, setSearchParams] = useSearchParams()

  function cambiar(val: AmbitoCapacitacion | "todos") {
    setSearchParams(
      (sp) => {
        const next = new URLSearchParams(sp)
        if (val === "todos") next.delete("ambito")
        else next.set("ambito", val)
        next.delete("pagina")
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => cambiar("todos")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          !ambito
            ? "bg-navy-deep text-white shadow-luxe"
            : "bg-silver-100 text-silver-600 hover:bg-silver-200"
        }`}
      >
        Todos
      </button>
      {ambitos.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => cambiar(a)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            ambito === a
              ? "bg-navy-deep text-white shadow-luxe"
              : "bg-silver-100 text-silver-600 hover:bg-silver-200"
          }`}
        >
          {AMBITO_LABEL[a]}
        </button>
      ))}
    </div>
  )
}

// ── Fila de curso — Link directo a /cursos/:id (SIN acordeón/modal) ───────

function FilaCurso({ curso: c }: { curso: Curso }) {
  const pillCls = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_REGISTRO_BADGE[c.estadoRegistro]}`

  return (
    <Link
      to={c.id}
      className="premium-card row-fade flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-estado-listoBg"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50 ring-1 ring-navy-200 dark:bg-surface-2 dark:ring-border">
        <Icon name="book" className="h-4 w-4 text-gold-600" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-navy-900">{c.titulo}</span>
        <span className="block truncate text-xs text-silver-600">
          {AMBITO_LABEL[c.ambito]}
          {c.descripcion ? ` · ${c.descripcion}` : ""}
        </span>
      </span>
      {/* Dato hero: inscritos — visible sin entrar al detalle. */}
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-silver-600 sm:flex">
        <Icon name="users" className="h-3.5 w-3.5" />
        <span className="tabular-nums font-medium text-navy-700">{c.totalInscritos}</span>
        <span className="hidden lg:inline">{c.totalInscritos === 1 ? "inscrito" : "inscritos"}</span>
      </span>
      <span className={pillCls}>
        <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_REGISTRO_DOT[c.estadoRegistro]}`} />
        {ESTADO_REGISTRO_LABEL[c.estadoRegistro]}
      </span>
    </Link>
  )
}
