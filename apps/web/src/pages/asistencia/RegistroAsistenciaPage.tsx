import { useState } from "react"
import { useParams } from "react-router-dom"
import {
  formatFechaHora,
  TIPO_VINCULO_LABEL,
  TIPOS_VINCULO,
} from "@pys/shared"
import type { TipoVinculo } from "@pys/shared"
import { ApiError } from "../../lib/api"
import {
  useCapacitacionPublica,
  useRegistrarAsistencia,
} from "../../hooks/useRegistroAsistencia"

const inputCls =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition placeholder:text-muted focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-300/45"

/**
 * Página pública de registro de asistencia — sin auth, accesible por QR.
 * Carga la info de la capacitación por `token` (URL param), muestra el
 * formulario de registro si el registro está abierto, y confirma o informa
 * si ya existe la asistencia (idempotente por documento). Diseñada para ser
 * usada desde el móvil tras escanear el QR.
 */
export function RegistroAsistenciaPage() {
  const { token } = useParams<{ token: string }>()
  const { data: capacitacion, isLoading, isError } = useCapacitacionPublica(token)

  if (isLoading) {
    return <PantallaBase><Cargando /></PantallaBase>
  }

  if (isError || !capacitacion) {
    return (
      <PantallaBase>
        <MensajeError titulo="Enlace no válido" mensaje="No encontramos este evento. Verifica que el código QR sea el correcto." />
      </PantallaBase>
    )
  }

  if (capacitacion.estadoRegistro === "BORRADOR") {
    return (
      <PantallaBase capacitacion={capacitacion}>
        <MensajeError
          titulo="Registro no disponible"
          mensaje="El gestor aún no ha abierto el registro de asistencia para este evento."
          tono="gold"
        />
      </PantallaBase>
    )
  }

  if (capacitacion.estadoRegistro === "CERRADO") {
    return (
      <PantallaBase capacitacion={capacitacion}>
        <MensajeError
          titulo="Registro cerrado"
          mensaje="El período de registro de asistencia para este evento ya finalizó."
          tono="info"
        />
      </PantallaBase>
    )
  }

  return (
    <PantallaBase capacitacion={capacitacion}>
      <FormularioAsistencia token={token!} />
    </PantallaBase>
  )
}

// ── Contenedor visual ─────────────────────────────────────────────────────

interface InfoCapacitacion {
  titulo: string
  descripcion: string | null
  lugar: string | null
  instructor: string | null
  iniciaEn: string
  terminaEn: string
  estadoRegistro: string
}

function PantallaBase({
  capacitacion,
  children,
}: {
  capacitacion?: InfoCapacitacion
  children: React.ReactNode
}) {
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
        {/* Info del evento */}
        {capacitacion && (
          <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-luxe">
            <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {capacitacion.titulo}
            </h1>
            <p className="mt-1 text-xs text-muted">
              {formatFechaHora(capacitacion.iniciaEn)}
              {capacitacion.lugar ? ` · ${capacitacion.lugar}` : ""}
              {capacitacion.instructor ? ` · ${capacitacion.instructor}` : ""}
            </p>
            {capacitacion.descripcion && (
              <p className="mt-2 text-sm text-muted">{capacitacion.descripcion}</p>
            )}
          </div>
        )}

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

// ── Formulario de asistencia ──────────────────────────────────────────────

type EstadoFormulario = "idle" | "enviando" | "ok" | "ya-existia" | "error"

function FormularioAsistencia({ token }: { token: string }) {
  const registrar = useRegistrarAsistencia(token)

  const [nombre, setNombre] = useState("")
  const [documento, setDocumento] = useState("")
  const [correo, setCorreo] = useState("")
  const [dependencia, setDependencia] = useState("")
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>("PLANTA")
  const [estado, setEstado] = useState<EstadoFormulario>("idle")
  const [mensajeError, setMensajeError] = useState("")

  const puedeEnviar =
    nombre.trim().length >= 2 &&
    documento.trim().length >= 3 &&
    estado !== "enviando"

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    setEstado("enviando")
    setMensajeError("")
    try {
      const resultado = await registrar.mutateAsync({
        nombre: nombre.trim(),
        documento: documento.trim(),
        correo: correo.trim() || undefined,
        dependencia: dependencia.trim() || undefined,
        tipoVinculo,
      })
      setEstado(resultado.yaExistia ? "ya-existia" : "ok")
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Ocurrió un error. Intenta de nuevo."
      setMensajeError(msg)
      setEstado("error")
    }
  }

  if (estado === "ok") {
    return (
      <div className="rounded-2xl border border-estado-ok/30 bg-estado-okBg px-5 py-6 text-center">
        <div className="mb-2 text-3xl" aria-hidden>
          ✓
        </div>
        <p className="font-semibold text-estado-ok">Asistencia registrada</p>
        <p className="mt-1 text-sm text-estado-ok/80">
          Tu asistencia quedó registrada correctamente. Gracias.
        </p>
      </div>
    )
  }

  if (estado === "ya-existia") {
    return (
      <div className="rounded-2xl border border-estado-info/30 bg-estado-infoBg px-5 py-6 text-center">
        <p className="font-semibold text-estado-info">Ya registrado</p>
        <p className="mt-1 text-sm text-estado-info/80">
          Tu asistencia ya había sido registrada para este evento.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleEnviar(e)} className="space-y-4">
      <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-luxe">
        <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Datos del asistente
        </p>

        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">
              Nombre completo <span className="text-estado-rechazo">*</span>
            </span>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={200}
              placeholder="Tu nombre completo"
              autoComplete="name"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">
              Número de documento <span className="text-estado-rechazo">*</span>
            </span>
            <input
              required
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              maxLength={30}
              placeholder="CC / NIT / Pasaporte"
              autoComplete="off"
              inputMode="numeric"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">
              Correo electrónico
            </span>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              maxLength={200}
              placeholder="tu@correo.com"
              autoComplete="email"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">
              Dependencia / Empresa
            </span>
            <input
              value={dependencia}
              onChange={(e) => setDependencia(e.target.value)}
              maxLength={200}
              placeholder="p. ej. Facultad de Ingeniería"
              className={inputCls}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Tipo de vínculo</span>
            <div className="flex flex-wrap gap-2">
              {TIPOS_VINCULO.map((tv) => (
                <label
                  key={tv}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    tipoVinculo === tv
                      ? "border-gold-300 bg-surface-2 text-foreground"
                      : "border-border bg-card text-muted hover:border-hairline"
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoVinculo"
                    value={tv}
                    checked={tipoVinculo === tv}
                    onChange={() => setTipoVinculo(tv)}
                    className="sr-only"
                  />
                  {TIPO_VINCULO_LABEL[tv]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {estado === "error" && (
        <p className="rounded-lg border border-estado-rechazo/30 bg-estado-rechazoBg px-4 py-3 text-sm text-estado-rechazo">
          {mensajeError}
        </p>
      )}

      <button
        type="submit"
        disabled={!puedeEnviar}
        className="w-full rounded-xl bg-navy-deep py-3.5 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
      >
        {estado === "enviando" ? "Registrando…" : "Registrar mi asistencia"}
      </button>
    </form>
  )
}
