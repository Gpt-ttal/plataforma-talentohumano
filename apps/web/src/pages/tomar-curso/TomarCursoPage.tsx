import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import type { IngresoCursoResultado, LeccionPublica } from "@pys/shared"
import { TIPO_CONTENIDO_LABEL } from "@pys/shared"
import { apiCursosPublico, ApiError } from "../../lib/api"
import { useCompletarLeccion, useCursoPublico } from "../../hooks/useTomarCurso"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { PROSE_LECCION_CLS } from "../cursos/LeccionForm"
import { FormularioCedula } from "./FormularioCedula"

function claveSesion(token: string) {
  return `curso:${token}:ingreso`
}

/**
 * Página pública para tomar un curso — sin auth, accesible por link/QR. Carga
 * la vista previa del curso por `token`, pide la cédula para identificarse (o
 * reanuda automáticamente si ya se había ingresado en esta pestaña) y muestra
 * el contenido con progreso marcable lección a lección.
 */
export function TomarCursoPage() {
  const { token } = useParams<{ token: string }>()
  const { data: curso, isLoading, isError } = useCursoPublico(token)

  const [resultado, setResultado] = useState<IngresoCursoResultado | null>(null)
  const [reanudando, setReanudando] = useState(false)
  const intentoRef = useRef(false)

  useEffect(() => {
    intentoRef.current = false
    setResultado(null)
    setReanudando(false)
    if (!token) return

    const raw = sessionStorage.getItem(claveSesion(token))
    if (!raw) return
    if (intentoRef.current) return
    intentoRef.current = true

    let datos: { nombre: string; documento: string }
    try {
      datos = JSON.parse(raw)
    } catch {
      sessionStorage.removeItem(claveSesion(token))
      return
    }

    setReanudando(true)
    apiCursosPublico
      .ingresar(token, datos)
      .then((r) => setResultado(r))
      .catch((e) => {
        toast.error(e instanceof ApiError ? e.message : "No se pudo reanudar la sesión.")
        sessionStorage.removeItem(claveSesion(token))
      })
      .finally(() => setReanudando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (isLoading || reanudando) {
    return (
      <PantallaBase>
        <Cargando />
      </PantallaBase>
    )
  }

  if (isError || !curso) {
    return (
      <PantallaBase>
        <MensajeError
          titulo="Enlace no válido"
          mensaje="No encontramos este curso. Verifica que el enlace sea el correcto."
        />
      </PantallaBase>
    )
  }

  if (curso.estadoRegistro === "BORRADOR") {
    return (
      <PantallaBase>
        <MensajeError
          titulo="Curso no disponible"
          mensaje="El gestor aún no ha publicado este curso."
          tono="gold"
        />
      </PantallaBase>
    )
  }

  if (!resultado) {
    return (
      <PantallaBase>
        <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-luxe">
          <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
            {curso.titulo}
          </h1>
          {curso.descripcion && (
            <p className="mt-2 text-sm text-muted">{curso.descripcion}</p>
          )}
          <p className="mt-3 text-xs text-faint">
            {curso.totalModulos} {curso.totalModulos === 1 ? "módulo" : "módulos"} ·{" "}
            {curso.totalLecciones}{" "}
            {curso.totalLecciones === 1 ? "lección" : "lecciones"}
          </p>
        </div>

        <FormularioCedula
          token={token!}
          onIngresado={(r, datos) => {
            sessionStorage.setItem(claveSesion(token!), JSON.stringify(datos))
            setResultado(r)
          }}
        />
      </PantallaBase>
    )
  }

  return (
    <PantallaBase>
      <VistaContenido
        token={token!}
        resultado={resultado}
        onResultado={setResultado}
      />
    </PantallaBase>
  )
}

// ── Contenedor visual ─────────────────────────────────────────────────────

function PantallaBase({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg text-foreground">
      {/* Membrete institucional */}
      <header className="border-b border-border bg-elevated px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <img
            src="/logo-americana.png"
            alt="Corporación Universitaria Americana"
            className="h-9 w-auto"
          />
          <span className="min-w-0 leading-none">
            <span className="block text-[13px] font-bold tracking-wide text-foreground">
              Gestión Humana
            </span>
            <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-muted">
              Corporación Universitaria Americana
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-hairline py-4 text-center font-mono text-[10px] text-faint">
        Sistema Paz y Salvo · Corporación Universitaria Americana
      </footer>
    </div>
  )
}

// ── Estados no-formulario ─────────────────────────────────────────────────

function Cargando() {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-gold-500" />
      <p className="text-sm text-muted">Cargando…</p>
    </div>
  )
}

function MensajeError({
  titulo,
  mensaje,
  tono = "rechazo",
}: {
  titulo: string
  mensaje: string
  tono?: "rechazo" | "gold" | "info"
}) {
  const colores = {
    rechazo: "border-estado-rechazo/25 bg-estado-rechazoBg text-estado-rechazo",
    gold: "border-gold-300/40 bg-gold-50 text-gold-700",
    info: "border-estado-info/25 bg-estado-infoBg text-estado-info",
  }
  return (
    <div className={`rounded-2xl border px-5 py-5 ${colores[tono]}`}>
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1 text-sm opacity-80">{mensaje}</p>
    </div>
  )
}

// ── Vista de contenido (con inscripción activa) ───────────────────────────

function VistaContenido({
  token,
  resultado,
  onResultado,
}: {
  token: string
  resultado: IngresoCursoResultado
  onResultado: (r: IngresoCursoResultado) => void
}) {
  const { curso, modulos, progreso } = resultado
  const completo = progreso.porcentaje >= 100

  return (
    <>
      <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-luxe">
        <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
          {curso.titulo}
        </h1>
        {curso.descripcion && (
          <p className="mt-2 text-sm text-muted">{curso.descripcion}</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-luxe">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Tu progreso
          </p>
          <p className="tabular-nums text-sm font-semibold text-foreground">
            {progreso.completadas} de {progreso.totalLecciones} lecciones ·{" "}
            {progreso.porcentaje}%
          </p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all ${completo ? "bg-estado-ok" : "bg-gold-500"}`}
            style={{ width: `${progreso.porcentaje}%` }}
          />
        </div>
      </div>

      {completo && (
        <div className="rounded-2xl border border-estado-ok/30 bg-estado-okBg px-5 py-6 text-center">
          <div className="mb-2 text-3xl" aria-hidden>
            ✓
          </div>
          <p className="font-semibold text-estado-ok">Curso completado</p>
          <p className="mt-1 text-sm text-estado-ok/80">
            Completaste todas las lecciones de este curso. ¡Bien hecho!
          </p>
        </div>
      )}

      <div className="space-y-3">
        {modulos.map((modulo, i) => {
          const completadasModulo = modulo.lecciones.filter(
            (l) => l.completada,
          ).length
          return (
            <FilaDesplegable
              key={modulo.id}
              defaultOpen={i === 0}
              cabecera={
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {modulo.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {completadasModulo} de {modulo.lecciones.length} completadas
                  </span>
                </span>
              }
            >
              <div className="divide-y divide-hairline">
                {modulo.lecciones.map((leccion) => (
                  <FilaLeccion
                    key={leccion.id}
                    token={token}
                    documento={resultado.inscripcion.documento}
                    leccion={leccion}
                    onResultado={onResultado}
                  />
                ))}
              </div>
            </FilaDesplegable>
          )
        })}
      </div>
    </>
  )
}

function FilaLeccion({
  token,
  documento,
  leccion,
  onResultado,
}: {
  token: string
  documento: string
  leccion: LeccionPublica
  onResultado: (r: IngresoCursoResultado) => void
}) {
  const completar = useCompletarLeccion(token)
  const [mensajeError, setMensajeError] = useState("")

  async function handleCompletar() {
    setMensajeError("")
    try {
      const r = await completar.mutateAsync({ leccionId: leccion.id, documento })
      onResultado(r)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Ocurrió un error. Intenta de nuevo."
      setMensajeError(msg)
    }
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{leccion.titulo}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
          {TIPO_CONTENIDO_LABEL[leccion.tipoContenido]}
        </span>
      </div>

      {leccion.tipoContenido === "TEXTO" && leccion.contenidoTexto && (
        <div
          className={PROSE_LECCION_CLS + " mt-3 text-sm text-foreground"}
          dangerouslySetInnerHTML={{ __html: leccion.contenidoTexto }}
        />
      )}

      {leccion.tipoContenido === "VIDEO" && leccion.urlVideo && (
        <a
          href={leccion.urlVideo}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold-300 bg-gold-50 px-3 py-2 text-sm font-semibold text-gold-700 transition hover:bg-gold-100"
        >
          Ver video ↗
        </a>
      )}

      {mensajeError && (
        <p className="mt-3 rounded-lg border border-estado-rechazo/30 bg-estado-rechazoBg px-3 py-2 text-xs text-estado-rechazo">
          {mensajeError}
        </p>
      )}

      <div className="mt-3">
        {leccion.completada ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg border border-estado-ok/30 bg-estado-okBg px-3 py-2 text-xs font-semibold text-estado-ok"
          >
            Completada ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleCompletar()}
            disabled={completar.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-deep px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
          >
            {completar.isPending ? "Guardando…" : "Marcar como completada"}
          </button>
        )}
      </div>
    </div>
  )
}
