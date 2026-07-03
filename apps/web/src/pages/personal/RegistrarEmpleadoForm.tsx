import { useState } from "react"
import { toast } from "sonner"
import { TIPO_VINCULACION_LABEL, TIPOS_VINCULACION } from "@pys/shared"
import type { TipoVinculacion } from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useCrearEmpleado } from "../../hooks/usePersonal"

export const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50 dark:bg-surface-2 dark:text-foreground dark:border-border"

/** Alta manual de un empleado (nace ACTIVO, sin trámite ni aprobaciones). */
export function RegistrarEmpleadoForm() {
  const crear = useCrearEmpleado()
  const [documento, setDocumento] = useState("")
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [tipoVinculacion, setTipoVinculacion] = useState<TipoVinculacion>("ADMINISTRATIVO")
  const [cargo, setCargo] = useState("")
  const [areaOrigen, setAreaOrigen] = useState("")
  const [fechaIngreso, setFechaIngreso] = useState("")
  const [correoInstitucional, setCorreoInstitucional] = useState("")
  const [telefono, setTelefono] = useState("")
  const [error, setError] = useState<string | null>(null)

  const puedeCrear =
    documento.trim().length >= 3 &&
    nombreCompleto.trim().length >= 2 &&
    cargo.trim().length >= 2 &&
    areaOrigen.trim().length >= 2 &&
    !crear.isPending

  async function handleCrear() {
    setError(null)
    if (!puedeCrear) {
      setError("Completa documento, nombre, cargo y área.")
      return
    }
    try {
      await crear.mutateAsync({
        documento: documento.trim(),
        nombreCompleto: nombreCompleto.trim(),
        tipoVinculacion,
        cargo: cargo.trim(),
        areaOrigen: areaOrigen.trim(),
        fechaIngreso: fechaIngreso || undefined,
        correoInstitucional: correoInstitucional.trim() || undefined,
        telefono: telefono.trim() || undefined,
      })
      setDocumento("")
      setNombreCompleto("")
      setCargo("")
      setAreaOrigen("")
      setFechaIngreso("")
      setCorreoInstitucional("")
      setTelefono("")
      toast.success("Empleado registrado.")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo registrar el empleado.")
    }
  }

  return (
    <div className="premium-card space-y-4 rounded-xl px-4 py-4">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-600">
        Registrar empleado
      </span>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo etiqueta="Documento">
          <input
            value={documento}
            maxLength={30}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder="p. ej. 1002003004"
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Nombre completo" className="sm:col-span-2 lg:col-span-2">
          <input
            value={nombreCompleto}
            maxLength={160}
            onChange={(e) => setNombreCompleto(e.target.value)}
            placeholder="Nombre y apellidos"
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Tipo de vínculo">
          <select
            value={tipoVinculacion}
            onChange={(e) => setTipoVinculacion(e.target.value as TipoVinculacion)}
            disabled={crear.isPending}
            className={inputCls}
          >
            {TIPOS_VINCULACION.map((t) => (
              <option key={t} value={t}>
                {TIPO_VINCULACION_LABEL[t]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Cargo">
          <input
            value={cargo}
            maxLength={160}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="p. ej. Analista"
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Área actual">
          <input
            value={areaOrigen}
            maxLength={160}
            onChange={(e) => setAreaOrigen(e.target.value)}
            placeholder="p. ej. Sistemas"
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Fecha de ingreso">
          <input
            type="date"
            value={fechaIngreso}
            onChange={(e) => setFechaIngreso(e.target.value)}
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Correo institucional">
          <input
            type="email"
            value={correoInstitucional}
            maxLength={200}
            onChange={(e) => setCorreoInstitucional(e.target.value)}
            placeholder="nombre@americana.edu.co"
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>

        <Campo etiqueta="Teléfono">
          <input
            value={telefono}
            maxLength={40}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Opcional"
            disabled={crear.isPending}
            className={inputCls}
          />
        </Campo>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!puedeCrear}
          onClick={() => void handleCrear()}
          className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
        >
          {crear.isPending ? "Registrando…" : "Registrar empleado"}
        </button>
        {error && <p className="text-xs text-estado-rechazo">{error}</p>}
      </div>
    </div>
  )
}

function Campo({
  etiqueta,
  children,
  className = "",
}: {
  etiqueta: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
        {etiqueta}
      </span>
      {children}
    </label>
  )
}
