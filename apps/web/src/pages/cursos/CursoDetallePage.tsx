import { useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"
import {
  AMBITO_LABEL,
  ESTADO_REGISTRO_BADGE,
  ESTADO_REGISTRO_DOT,
  ESTADO_REGISTRO_LABEL,
  TIPO_CONTENIDO_LABEL,
  formatFechaHora,
  puedeGestionarAmbito,
  registroAbierto,
} from "@pys/shared"
import type { Curso, CursoModuloConLecciones, Leccion } from "@pys/shared"
import { ApiError } from "../../lib/api"
import {
  useCursoDetalle,
  useInscritosCurso,
  useAbrirRegistroCurso,
  useCerrarRegistroCurso,
  useCrearModulo,
  useEditarModulo,
  useMoverModulo,
  useEliminarModulo,
  useCrearLeccion,
  useEditarLeccion,
  useMoverLeccion,
  useEliminarLeccion,
} from "../../hooks/useCursos"
import { useRole } from "../../hooks/useRole"
import { PageHeader, HeaderMetaDot } from "../../components/ui/PageHeader"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { EmptyState } from "../../components/ui/EmptyState"
import { Segmented } from "../../components/ui/Segmented"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { SpotSinResultados } from "../../components/ui/spot/Spots"
import { LeccionForm, type LeccionFormValores } from "./LeccionForm"

const BASE_WEB = import.meta.env.VITE_WEB_URL ?? window.location.origin

const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Página dedicada `/cursos/:id` (NO modal — este módulo conserva página propia,
 * a diferencia de Personal/Vacantes que migraron a modal). Cabecera con
 * transición de registro + QR, pestañas Contenido/Inscritos server-driven
 * por `?vista=`, editor anidado módulos→lecciones y el panel de inscritos en
 * vivo (`refetchInterval` de 5s ya construido en la Fase 5).
 */
export function CursoDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { rol } = useRole()
  const { data, isLoading, isError } = useCursoDetalle(id)

  const vista = (searchParams.get("vista") ?? "contenido") as "contenido" | "inscritos"

  if (isLoading) return <ListaSkeleton filas={5} />
  if (isError || !data) {
    return (
      <EmptyState
        titulo="No se pudo cargar el curso"
        mensaje="Vuelve al listado e inténtalo de nuevo."
        accion={
          <Link to="/cursos" className="text-sm font-semibold text-navy-600 hover:text-gold-600">
            ← Volver a Cursos
          </Link>
        }
      />
    )
  }

  const { curso, modulos, totalLecciones, totalInscritos } = data
  const puedeGestionar = rol ? puedeGestionarAmbito(rol, curso.ambito) : false

  return (
    <div className="space-y-7">
      <PageHeader
        title={curso.titulo}
        description={curso.descripcion ?? undefined}
        meta={
          <>
            <span>{AMBITO_LABEL[curso.ambito]}</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">
              {totalLecciones} lecciones · {totalInscritos} inscritos
            </HeaderMetaDot>
          </>
        }
      />

      <CabeceraAcciones curso={curso} puedeGestionar={puedeGestionar} />

      <Segmented
        etiqueta="Vista"
        activo={vista}
        opciones={[
          { value: "contenido", label: "Contenido", href: "?vista=contenido" },
          { value: "inscritos", label: `Inscritos (${totalInscritos})`, href: "?vista=inscritos" },
        ]}
      />

      {vista === "contenido" ? (
        <ContenidoTab cursoId={curso.id} modulos={modulos} puedeGestionar={puedeGestionar} />
      ) : (
        <InscritosTab cursoId={curso.id} />
      )}
    </div>
  )
}

// ── Cabecera: transición de registro + QR ───────────────────────────────────

function CabeceraAcciones({
  curso,
  puedeGestionar,
}: {
  curso: Curso
  puedeGestionar: boolean
}) {
  const abrir = useAbrirRegistroCurso()
  const cerrar = useCerrarRegistroCurso()
  const urlPublica = `${BASE_WEB}/tomar-curso/${curso.token}`
  const esBorrador = curso.estadoRegistro === "BORRADOR"
  const estaAbierto = registroAbierto(curso.estadoRegistro)
  const pendiente = abrir.isPending || cerrar.isPending

  async function handleAbrir() {
    try {
      await abrir.mutateAsync(curso.id)
      toast.success("Registro abierto. El curso ya es accesible por el enlace público.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo abrir el registro.")
    }
  }

  async function handleCerrar() {
    try {
      await cerrar.mutateAsync(curso.id)
      toast.success("Registro cerrado. Quienes ya estaban inscritos pueden seguir avanzando.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo cerrar el registro.")
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(urlPublica)
      toast.success("Enlace copiado.")
    } catch {
      toast.error("No se pudo copiar el enlace.")
    }
  }

  const pillCls = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_REGISTRO_BADGE[curso.estadoRegistro]}`

  return (
    <div className="premium-card flex flex-wrap items-start justify-between gap-6 rounded-xl px-4 py-4">
      <div className="space-y-3">
        <span className={pillCls}>
          <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_REGISTRO_DOT[curso.estadoRegistro]}`} />
          {ESTADO_REGISTRO_LABEL[curso.estadoRegistro]}
        </span>

        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            {esBorrador && (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => void handleAbrir()}
                className="rounded-lg bg-estado-okBg px-3 py-1.5 text-xs font-semibold text-estado-ok ring-1 ring-estado-ok/30 transition hover:bg-estado-ok hover:text-white disabled:opacity-50"
              >
                {abrir.isPending ? "Abriendo…" : "Abrir registro"}
              </button>
            )}
            {estaAbierto && (
              <button
                type="button"
                disabled={pendiente}
                onClick={() => void handleCerrar()}
                className="rounded-lg bg-estado-infoBg px-3 py-1.5 text-xs font-semibold text-estado-info ring-1 ring-estado-info/30 transition hover:bg-estado-info hover:text-white disabled:opacity-50"
              >
                {cerrar.isPending ? "Cerrando…" : "Cerrar registro"}
              </button>
            )}
          </div>
        )}

        {esBorrador && (
          <p className="max-w-sm text-xs font-medium text-gold-600">
            El curso está en borrador. Ábrelo para que los funcionarios puedan tomarlo.
          </p>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className="rounded-xl border border-silver-200 bg-white p-3 shadow-luxe">
          <QRCodeSVG value={urlPublica} size={140} bgColor="#ffffff" fgColor="#142943" level="M" />
        </div>
        <div className="max-w-xs space-y-2">
          <p className="text-xs text-silver-600">
            Comparte este enlace o código con los funcionarios. Al escanearlo o
            abrirlo se identifican por cédula — sin cuenta.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-silver-200 bg-silver-50 px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-silver-600">
              {urlPublica}
            </span>
            <button
              type="button"
              onClick={() => void copiar()}
              title="Copiar enlace"
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-silver-600 transition hover:bg-silver-200 hover:text-navy-800"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab Contenido: módulos → lecciones ──────────────────────────────────────

function ContenidoTab({
  cursoId,
  modulos,
  puedeGestionar,
}: {
  cursoId: string
  modulos: CursoModuloConLecciones[]
  puedeGestionar: boolean
}) {
  const crearModulo = useCrearModulo()
  const [nuevoModuloTitulo, setNuevoModuloTitulo] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleCrearModulo() {
    if (nuevoModuloTitulo.trim().length < 2) {
      setError("El título del módulo debe tener al menos 2 caracteres.")
      return
    }
    setError(null)
    try {
      await crearModulo.mutateAsync({ cursoId, titulo: nuevoModuloTitulo.trim() })
      setNuevoModuloTitulo("")
      toast.success("Módulo agregado.")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo crear el módulo.")
    }
  }

  return (
    <div className="space-y-4">
      {modulos.length === 0 ? (
        <EmptyState
          titulo="Sin módulos todavía"
          mensaje="Agrega el primer módulo para empezar a construir el curso."
        />
      ) : (
        <div className="space-y-3">
          {modulos.map((m, i) => (
            <ModuloRow
              key={m.id}
              cursoId={cursoId}
              modulo={m}
              esPrimero={i === 0}
              esUltimo={i === modulos.length - 1}
              puedeGestionar={puedeGestionar}
            />
          ))}
        </div>
      )}

      {puedeGestionar && (
        <div className="premium-card flex flex-wrap items-center gap-3 rounded-xl px-4 py-3">
          <input
            value={nuevoModuloTitulo}
            maxLength={200}
            onChange={(e) => setNuevoModuloTitulo(e.target.value)}
            placeholder="Título del nuevo módulo…"
            disabled={crearModulo.isPending}
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            disabled={crearModulo.isPending || nuevoModuloTitulo.trim().length < 2}
            onClick={() => void handleCrearModulo()}
            className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
          >
            {crearModulo.isPending ? "Agregando…" : "Agregar módulo"}
          </button>
          {error && <p className="w-full text-xs text-estado-rechazo">{error}</p>}
        </div>
      )}
    </div>
  )
}

function ModuloRow({
  cursoId,
  modulo,
  esPrimero,
  esUltimo,
  puedeGestionar,
}: {
  cursoId: string
  modulo: CursoModuloConLecciones
  esPrimero: boolean
  esUltimo: boolean
  puedeGestionar: boolean
}) {
  const mover = useMoverModulo()
  const editar = useEditarModulo()
  const eliminar = useEliminarModulo()
  const crearLeccion = useCrearLeccion()

  const [renombrando, setRenombrando] = useState(false)
  const [tituloEdit, setTituloEdit] = useState(modulo.titulo)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [creandoLeccion, setCreandoLeccion] = useState(false)

  async function handleMover(direccion: "subir" | "bajar") {
    try {
      await mover.mutateAsync({ cursoId, moduloId: modulo.id, direccion })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo reordenar.")
    }
  }

  async function handleRenombrar() {
    if (tituloEdit.trim().length < 2) return
    try {
      await editar.mutateAsync({ cursoId, moduloId: modulo.id, titulo: tituloEdit.trim() })
      setRenombrando(false)
      toast.success("Módulo renombrado.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo renombrar.")
    }
  }

  async function handleEliminar() {
    try {
      await eliminar.mutateAsync({ cursoId, moduloId: modulo.id })
      toast.success("Módulo eliminado.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar el módulo.")
      setConfirmarEliminar(false)
    }
  }

  async function handleCrearLeccion(valores: LeccionFormValores) {
    try {
      await crearLeccion.mutateAsync({ cursoId, moduloId: modulo.id, input: valores })
      setCreandoLeccion(false)
      toast.success("Lección agregada.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo crear la lección.")
    }
  }

  return (
    <FilaDesplegable
      cabecera={
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-mono text-xs text-silver-500">Módulo {modulo.orden}</span>
          <span className="min-w-0 flex-1 truncate font-medium text-navy-900">{modulo.titulo}</span>
          <span className="shrink-0 text-xs text-silver-600">
            {modulo.lecciones.length} lección{modulo.lecciones.length === 1 ? "" : "es"}
          </span>
        </span>
      }
      acciones={
        puedeGestionar ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Subir"
              disabled={esPrimero || mover.isPending}
              onClick={() => void handleMover("subir")}
              className="grid h-7 w-7 place-items-center rounded text-silver-600 hover:bg-silver-200 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              title="Bajar"
              disabled={esUltimo || mover.isPending}
              onClick={() => void handleMover("bajar")}
              className="grid h-7 w-7 place-items-center rounded text-silver-600 hover:bg-silver-200 disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {puedeGestionar && (
          <div className="flex flex-wrap items-center gap-2">
            {renombrando ? (
              <>
                <input
                  value={tituloEdit}
                  maxLength={200}
                  onChange={(e) => setTituloEdit(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => void handleRenombrar()}
                  disabled={editar.isPending}
                  className="rounded-lg bg-navy-deep px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenombrando(false)
                    setTituloEdit(modulo.titulo)
                  }}
                  className="text-xs text-silver-600 hover:text-navy-800"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setRenombrando(true)}
                className="text-xs font-medium text-navy-600 hover:text-gold-600"
              >
                Renombrar módulo
              </button>
            )}

            <span className="text-silver-300">·</span>

            {confirmarEliminar ? (
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-estado-rechazo">¿Eliminar el módulo y sus lecciones?</span>
                <button
                  type="button"
                  onClick={() => void handleEliminar()}
                  disabled={eliminar.isPending}
                  className="font-semibold text-estado-rechazo hover:underline"
                >
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmarEliminar(false)}
                  className="text-silver-600 hover:text-navy-800"
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmarEliminar(true)}
                className="text-xs font-medium text-estado-rechazo hover:underline"
              >
                Eliminar módulo
              </button>
            )}
          </div>
        )}

        {modulo.lecciones.length === 0 ? (
          <p className="text-sm text-silver-500">Sin lecciones todavía.</p>
        ) : (
          <div className="space-y-2">
            {modulo.lecciones.map((l, i) => (
              <LeccionRow
                key={l.id}
                cursoId={cursoId}
                moduloId={modulo.id}
                leccion={l}
                esPrimero={i === 0}
                esUltimo={i === modulo.lecciones.length - 1}
                puedeGestionar={puedeGestionar}
              />
            ))}
          </div>
        )}

        {puedeGestionar &&
          (creandoLeccion ? (
            <div className="rounded-lg border border-silver-200 bg-silver-50 p-3">
              <LeccionForm
                guardando={crearLeccion.isPending}
                onGuardar={handleCrearLeccion}
                onCancelar={() => setCreandoLeccion(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreandoLeccion(true)}
              className="text-xs font-semibold text-navy-600 hover:text-gold-600"
            >
              + Agregar lección
            </button>
          ))}
      </div>
    </FilaDesplegable>
  )
}

function LeccionRow({
  cursoId,
  moduloId,
  leccion,
  esPrimero,
  esUltimo,
  puedeGestionar,
}: {
  cursoId: string
  moduloId: string
  leccion: Leccion
  esPrimero: boolean
  esUltimo: boolean
  puedeGestionar: boolean
}) {
  const mover = useMoverLeccion()
  const editar = useEditarLeccion()
  const eliminar = useEliminarLeccion()
  const [editando, setEditando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  async function handleMover(direccion: "subir" | "bajar") {
    try {
      await mover.mutateAsync({ cursoId, moduloId, leccionId: leccion.id, direccion })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo reordenar.")
    }
  }

  async function handleGuardar(valores: LeccionFormValores) {
    try {
      await editar.mutateAsync({ cursoId, moduloId, leccionId: leccion.id, input: valores })
      setEditando(false)
      toast.success("Lección actualizada.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo guardar la lección.")
    }
  }

  async function handleEliminar() {
    try {
      await eliminar.mutateAsync({ cursoId, moduloId, leccionId: leccion.id })
      toast.success("Lección eliminada.")
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar la lección.")
      setConfirmarEliminar(false)
    }
  }

  if (editando) {
    return (
      <div className="rounded-lg border border-gold-200 bg-gold-50/40 p-3">
        <LeccionForm
          key={leccion.id}
          inicial={leccion}
          guardando={editar.isPending}
          onGuardar={handleGuardar}
          onCancelar={() => setEditando(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-silver-100 bg-white px-3 py-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-silver-100 text-[10px] font-bold text-silver-600">
        {leccion.tipoContenido === "VIDEO" ? "▶" : "T"}
      </span>
      <button
        type="button"
        onClick={() => puedeGestionar && setEditando(true)}
        disabled={!puedeGestionar}
        className="min-w-0 flex-1 truncate text-left text-sm font-medium text-navy-800 hover:text-gold-600 disabled:cursor-default disabled:hover:text-navy-800"
      >
        {leccion.titulo}
      </button>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-silver-500">
        {TIPO_CONTENIDO_LABEL[leccion.tipoContenido]}
      </span>
      {puedeGestionar && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Subir"
            disabled={esPrimero || mover.isPending}
            onClick={() => void handleMover("subir")}
            className="grid h-6 w-6 place-items-center rounded text-silver-600 hover:bg-silver-200 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            title="Bajar"
            disabled={esUltimo || mover.isPending}
            onClick={() => void handleMover("bajar")}
            className="grid h-6 w-6 place-items-center rounded text-silver-600 hover:bg-silver-200 disabled:opacity-30"
          >
            ↓
          </button>
          {confirmarEliminar ? (
            <>
              <button
                type="button"
                onClick={() => void handleEliminar()}
                disabled={eliminar.isPending}
                className="text-[10px] font-semibold text-estado-rechazo hover:underline"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmarEliminar(false)}
                className="text-[10px] text-silver-600 hover:text-navy-800"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarEliminar(true)}
              title="Eliminar lección"
              className="grid h-6 w-6 place-items-center rounded text-estado-rechazo hover:bg-estado-rechazo/10"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab Inscritos: panel en vivo (refetchInterval 5s ya construido en Fase 5) ─

function InscritosTab({ cursoId }: { cursoId: string }) {
  const { data, isLoading } = useInscritosCurso(cursoId)

  if (isLoading) return <ListaSkeleton filas={3} />

  if (!data || data.length === 0) {
    return (
      <EmptyState
        ilustracion={<SpotSinResultados />}
        titulo="Sin inscritos todavía"
        mensaje="Comparte el enlace o el código QR para que los funcionarios empiecen a tomar el curso."
      />
    )
  }

  return (
    <div className="premium-card overflow-x-auto rounded-xl">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-silver-100 text-xs text-silver-600">
            <th className="px-4 py-2.5 font-semibold">Nombre</th>
            <th className="px-4 py-2.5 font-semibold">Documento</th>
            <th className="px-4 py-2.5 font-semibold">Progreso</th>
            <th className="px-4 py-2.5 font-semibold">Última actividad</th>
          </tr>
        </thead>
        <tbody>
          {data.map((i) => (
            <tr key={i.inscripcionId} className="border-b border-silver-50">
              <td className="px-4 py-2.5 font-medium text-navy-800">{i.nombre}</td>
              <td className="px-4 py-2.5 tabular-nums text-navy-700">{i.documento}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-silver-100">
                    <div
                      className="h-full rounded-full bg-estado-ok"
                      style={{ width: `${i.porcentaje}%` }}
                    />
                  </div>
                  <span className="tabular-nums text-xs text-silver-600">
                    {i.completadas}/{i.totalLecciones} ({i.porcentaje}%)
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-xs text-silver-600">
                {formatFechaHora(i.ultimaActividadEn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
