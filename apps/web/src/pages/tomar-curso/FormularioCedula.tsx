import { useState } from "react"
import type { IngresoCursoResultado } from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useIngresarCurso } from "../../hooks/useTomarCurso"

const inputCls =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition placeholder:text-muted focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-300/45"

type EstadoFormulario = "idle" | "enviando" | "error"

/**
 * Formulario de identificación por cédula para tomar un curso público (sin
 * login). Nuevo y retornante llegan al mismo resultado: no hay rama
 * "ya-existía" — el backend es idempotente por documento y siempre devuelve
 * el `IngresoCursoResultado` completo (con progreso ya calculado).
 */
export function FormularioCedula({
  token,
  onIngresado,
}: {
  token: string
  onIngresado: (
    r: IngresoCursoResultado,
    datos: { nombre: string; documento: string },
  ) => void
}) {
  const ingresar = useIngresarCurso(token)

  const [nombre, setNombre] = useState("")
  const [documento, setDocumento] = useState("")
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
    const datos = { nombre: nombre.trim(), documento: documento.trim() }
    try {
      const resultado = await ingresar.mutateAsync(datos)
      onIngresado(resultado, datos)
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Ocurrió un error. Intenta de nuevo."
      setMensajeError(msg)
      setEstado("error")
    }
  }

  return (
    <form onSubmit={(e) => void handleEnviar(e)} className="space-y-4">
      <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-luxe">
        <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Identifícate para continuar
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
              maxLength={120}
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
        {estado === "enviando" ? "Ingresando…" : "Ingresar al curso"}
      </button>
    </form>
  )
}
