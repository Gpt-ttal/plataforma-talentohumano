import { useState } from "react"
import { toast } from "sonner"
import { NOVEDAD_TIPO_LABEL, TIPO_VINCULACION_LABEL, TIPOS_VINCULACION } from "@pys/shared"
import type { Empleado, NovedadTipo, TipoVinculacion } from "@pys/shared"
import { ApiError } from "../../lib/api"
import { useEditarEmpleado, useFinalizarContrato, useRegistrarNovedad } from "../../hooks/usePersonal"
import { useGuardaCierre } from "../../components/ui/Modal"
import { CampoForm, inputCls, MensajeError } from "./bloques-editables/compartido"

/**
 * Acciones de gestión del empleado, todas con confirmación inline (sin modales
 * anidados): Actualizar datos (edición del núcleo), Finalizar contrato (puente
 * irreversible a Paz y Salvo) y Otro sí (cambio de cargo / extensión).
 */
export function AccionesEmpleado({ empleado, esActivo }: { empleado: Empleado; esActivo: boolean }) {
  return (
    <div className="space-y-2">
      <ActualizarDatos empleado={empleado} />
      {esActivo && <FinalizarContrato id={empleado.id} />}
      <OtroSi id={empleado.id} />
    </div>
  )
}

// ── Actualizar datos (edición del núcleo) ───────────────────────────────────

function ActualizarDatos({ empleado: e }: { empleado: Empleado }) {
  const editar = useEditarEmpleado()
  const [abierto, setAbierto] = useState(false)
  const [nombreCompleto, setNombreCompleto] = useState(e.nombreCompleto)
  const [tipoVinculacion, setTipoVinculacion] = useState<TipoVinculacion>(e.tipoVinculacion ?? "ADMINISTRATIVO")
  const [cargo, setCargo] = useState(e.cargo)
  const [areaOrigen, setAreaOrigen] = useState(e.areaOrigen)
  const [fechaIngreso, setFechaIngreso] = useState(e.fechaIngreso ?? "")
  const [fechaFinContrato, setFechaFinContrato] = useState(e.fechaFinContrato ?? "")
  const [correoInstitucional, setCorreoInstitucional] = useState(e.correoInstitucional ?? "")
  const [telefono, setTelefono] = useState(e.telefono ?? "")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "empleado-actualizar")

  function reset() {
    setNombreCompleto(e.nombreCompleto)
    setTipoVinculacion(e.tipoVinculacion ?? "ADMINISTRATIVO")
    setCargo(e.cargo)
    setAreaOrigen(e.areaOrigen)
    setFechaIngreso(e.fechaIngreso ?? "")
    setFechaFinContrato(e.fechaFinContrato ?? "")
    setCorreoInstitucional(e.correoInstitucional ?? "")
    setTelefono(e.telefono ?? "")
    setError(null)
  }

  async function confirmar() {
    setError(null)
    if (nombreCompleto.trim().length < 2 || cargo.trim().length < 2 || areaOrigen.trim().length < 2) {
      setError("Nombre, cargo y área no pueden quedar vacíos.")
      return
    }
    try {
      await editar.mutateAsync({
        id: e.id,
        input: {
          nombreCompleto: nombreCompleto.trim(),
          tipoVinculacion,
          cargo: cargo.trim(),
          areaOrigen: areaOrigen.trim(),
          fechaIngreso: fechaIngreso || null,
          fechaFinContrato: fechaFinContrato || null,
          correoInstitucional: correoInstitucional.trim() || null,
          telefono: telefono.trim() || null,
        },
      })
      toast.success("Datos actualizados.")
      setAbierto(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudieron actualizar los datos.")
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-silver-300 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:border-gold-400 dark:border-border dark:text-foreground"
      >
        Actualizar datos
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <CampoForm label="Nombre completo">
          <input
            value={nombreCompleto}
            maxLength={160}
            onChange={(ev) => setNombreCompleto(ev.target.value)}
            placeholder="Nombre y apellidos"
            disabled={editar.isPending}
            aria-invalid={!!error}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Tipo de vínculo">
          <select
            value={tipoVinculacion}
            onChange={(ev) => setTipoVinculacion(ev.target.value as TipoVinculacion)}
            disabled={editar.isPending}
            className={inputCls}
          >
            {TIPOS_VINCULACION.map((t) => (
              <option key={t} value={t}>
                {TIPO_VINCULACION_LABEL[t]}
              </option>
            ))}
          </select>
        </CampoForm>
        <CampoForm label="Cargo">
          <input
            value={cargo}
            maxLength={160}
            onChange={(ev) => setCargo(ev.target.value)}
            placeholder="p. ej. Analista"
            disabled={editar.isPending}
            aria-invalid={!!error}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Área actual">
          <input
            value={areaOrigen}
            maxLength={160}
            onChange={(ev) => setAreaOrigen(ev.target.value)}
            placeholder="p. ej. Sistemas"
            disabled={editar.isPending}
            aria-invalid={!!error}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Fecha de ingreso">
          <input
            type="date"
            value={fechaIngreso}
            onChange={(ev) => setFechaIngreso(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Fin de contrato">
          <input
            type="date"
            value={fechaFinContrato}
            onChange={(ev) => setFechaFinContrato(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Correo institucional">
          <input
            type="email"
            value={correoInstitucional}
            maxLength={200}
            onChange={(ev) => setCorreoInstitucional(ev.target.value)}
            placeholder="nombre@americana.edu.co"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
        <CampoForm label="Teléfono">
          <input
            value={telefono}
            maxLength={40}
            onChange={(ev) => setTelefono(ev.target.value)}
            placeholder="Opcional"
            disabled={editar.isPending}
            className={inputCls}
          />
        </CampoForm>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={editar.isPending}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-navy-deep px-3 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 disabled:opacity-50"
        >
          {editar.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset()
            setAbierto(false)
          }}
          disabled={editar.isPending}
          className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold text-silver-600 hover:text-navy-800"
        >
          Cancelar
        </button>
      </div>
      <MensajeError>{error}</MensajeError>
    </div>
  )
}

// ── Finalizar contrato (puente a Paz y Salvo) ───────────────────────────────

function FinalizarContrato({ id }: { id: string }) {
  const finalizar = useFinalizarContrato()
  const [confirmando, setConfirmando] = useState(false)
  const [fechaRetiro, setFechaRetiro] = useState("")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(confirmando, "empleado-finalizar")

  async function confirmar() {
    setError(null)
    if (!fechaRetiro) {
      setError("Selecciona la fecha de retiro.")
      return
    }
    try {
      await finalizar.mutateAsync({ id, fechaRetiro })
      toast.success("Contrato finalizado: el trámite de Paz y Salvo quedó iniciado.")
      setConfirmando(false)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo finalizar el contrato.")
    }
  }

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-estado-rechazo/40 bg-estado-rechazo/5 px-4 py-2 text-sm font-semibold text-estado-rechazo transition hover:bg-estado-rechazo/10"
      >
        Finalizar contrato
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-estado-rechazo/40 bg-estado-rechazo/5 p-3">
      <p className="text-sm font-medium text-estado-rechazo">
        Esta acción es irreversible: fija la fecha de retiro y abre el trámite de Paz y Salvo.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <CampoForm label="Fecha de retiro">
          <input
            type="date"
            value={fechaRetiro}
            onChange={(ev) => setFechaRetiro(ev.target.value)}
            disabled={finalizar.isPending}
            aria-invalid={!!error}
            className={inputCls}
          />
        </CampoForm>
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={finalizar.isPending}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-estado-rechazo px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {finalizar.isPending ? "Confirmando…" : "Confirmar"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          disabled={finalizar.isPending}
          className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold text-silver-600 hover:text-navy-800"
        >
          Cancelar
        </button>
      </div>
      <MensajeError>{error}</MensajeError>
    </div>
  )
}

// ── Otro sí (cambio de cargo / extensión de contrato) ───────────────────────

function OtroSi({ id }: { id: string }) {
  const registrar = useRegistrarNovedad()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<NovedadTipo>("CAMBIO_CARGO")
  const [motivo, setMotivo] = useState("")
  const [nuevoCargo, setNuevoCargo] = useState("")
  const [nuevaFechaFin, setNuevaFechaFin] = useState("")
  const [error, setError] = useState<string | null>(null)
  useGuardaCierre(abierto, "empleado-otrosi")

  async function confirmar() {
    setError(null)
    if (motivo.trim().length < 1) {
      setError("Indica el motivo.")
      return
    }
    if (tipo === "CAMBIO_CARGO" && nuevoCargo.trim().length < 2) {
      setError("Indica el nuevo cargo.")
      return
    }
    if (tipo === "EXTENSION_CONTRATO" && !nuevaFechaFin) {
      setError("Selecciona la nueva fecha de fin.")
      return
    }
    try {
      await registrar.mutateAsync({
        id,
        input:
          tipo === "CAMBIO_CARGO"
            ? { tipo, motivo: motivo.trim(), nuevoCargo: nuevoCargo.trim() }
            : { tipo, motivo: motivo.trim(), nuevaFechaFin },
      })
      toast.success("Novedad registrada.")
      setAbierto(false)
      setMotivo("")
      setNuevoCargo("")
      setNuevaFechaFin("")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo registrar la novedad.")
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-silver-300 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:border-gold-400 dark:border-border dark:text-foreground"
      >
        Registrar otro sí
      </button>
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="flex flex-wrap gap-2">
        <CampoForm label="Tipo de novedad">
          <select
            value={tipo}
            onChange={(ev) => setTipo(ev.target.value as NovedadTipo)}
            disabled={registrar.isPending}
            className={inputCls}
          >
            <option value="CAMBIO_CARGO">{NOVEDAD_TIPO_LABEL.CAMBIO_CARGO}</option>
            <option value="EXTENSION_CONTRATO">{NOVEDAD_TIPO_LABEL.EXTENSION_CONTRATO}</option>
          </select>
        </CampoForm>
        {tipo === "CAMBIO_CARGO" ? (
          <CampoForm label="Nuevo cargo">
            <input
              value={nuevoCargo}
              onChange={(ev) => setNuevoCargo(ev.target.value)}
              placeholder="p. ej. Coordinador"
              disabled={registrar.isPending}
              aria-invalid={!!error}
              className={inputCls}
            />
          </CampoForm>
        ) : (
          <CampoForm label="Nueva fecha de fin">
            <input
              type="date"
              value={nuevaFechaFin}
              onChange={(ev) => setNuevaFechaFin(ev.target.value)}
              disabled={registrar.isPending}
              aria-invalid={!!error}
              className={inputCls}
            />
          </CampoForm>
        )}
      </div>
      <CampoForm label="Motivo">
        <textarea
          value={motivo}
          onChange={(ev) => setMotivo(ev.target.value)}
          placeholder="Describe el motivo de la novedad"
          rows={2}
          maxLength={500}
          disabled={registrar.isPending}
          aria-invalid={!!error}
          className={`${inputCls} w-full resize-none`}
        />
      </CampoForm>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void confirmar()}
          disabled={registrar.isPending}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-navy-deep px-3 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 disabled:opacity-50"
        >
          {registrar.isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          disabled={registrar.isPending}
          className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold text-silver-600 hover:text-navy-800"
        >
          Cancelar
        </button>
      </div>
      <MensajeError>{error}</MensajeError>
    </div>
  )
}
