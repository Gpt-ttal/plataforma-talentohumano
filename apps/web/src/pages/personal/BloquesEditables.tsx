import { useState, type ReactNode } from "react"
import { toast } from "sonner"
import {
  GENEROS,
  GENERO_LABEL,
  MODALIDADES,
  MODALIDAD_LABEL,
  NIVELES_FORMACION,
  NIVEL_FORMACION_LABEL,
  PARENTESCOS,
  PARENTESCO_LABEL,
  TIPOS_CONTRATO,
  TIPO_CONTRATO_LABEL,
} from "@pys/shared"
import type {
  DatosPersonales,
  DatosSalariales,
  EmpleadoContractual,
  Experiencia,
  Familiar,
  Formacion,
  Genero,
  Modalidad,
  NivelFormacion,
  Parentesco,
  TipoContrato,
} from "@pys/shared"
import { ApiError } from "../../lib/api"
import { Avatar } from "../../components/ui/Avatar"
import { useAreas } from "../../hooks/useAreas"
import {
  useCrearExperiencia,
  useCrearFamiliar,
  useCrearFormacion,
  useEditarContractual,
  useEliminarExperiencia,
  useEliminarFamiliar,
  useEliminarFoto,
  useEliminarFormacion,
  useFotoUrl,
  useGuardarPersonales,
  useGuardarSalarial,
  useSubirFoto,
} from "../../hooks/usePersonal"

/**
 * Captura por bloque satélite de la hoja de vida 360° (Sprint 2). Cada editor es
 * autocontenido con el patrón de confirmación inline ya establecido en
 * `AccionesEmpleado`: botón "Editar/Agregar" → formulario → Guardar/Cancelar.
 * Los bloques 1-N (familia, formación, experiencia) listan + agregan + eliminan
 * en un solo componente (reemplazan el bloque de solo-lectura). Los bloques 1-1
 * (personal, contractual, salarial) se editan aparte del bloque de lectura de
 * `ExpedientePage`, porque cubren campos distintos (p. ej. `fechaIngreso` del
 * núcleo se edita en "Actualizar datos", no aquí).
 */

const inputCls =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50 dark:bg-surface-2 dark:text-foreground dark:border-border"
const labelCls = "flex flex-col gap-1"
const labelTextCls = "text-[11px] uppercase tracking-wide text-silver-600"

function mensajeError(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback
}

function BotonAbrir({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-lg border border-silver-300 px-4 py-2 text-sm font-semibold text-navy-700 transition hover:border-gold-400 dark:border-border dark:text-foreground"
    >
      {children}
    </button>
  )
}

function FilaGuardarCancelar({
  pending,
  onGuardar,
  onCancelar,
  guardandoLabel = "Guardando…",
  guardarLabel = "Guardar cambios",
}: {
  pending: boolean
  onGuardar: () => void
  onCancelar: () => void
  guardandoLabel?: string
  guardarLabel?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onGuardar}
        disabled={pending}
        className="rounded-lg bg-navy-deep px-3 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 disabled:opacity-50"
      >
        {pending ? guardandoLabel : guardarLabel}
      </button>
      <button
        type="button"
        onClick={onCancelar}
        disabled={pending}
        className="rounded-lg px-3 py-2 text-sm font-semibold text-silver-600 hover:text-navy-800"
      >
        Cancelar
      </button>
    </div>
  )
}

/** Fila de un ítem 1-N con "Eliminar" → confirmación inline de 1 clic. */
function FilaEliminable({
  children,
  pending,
  confirmando,
  onPedirConfirmar,
  onCancelarConfirmar,
  onConfirmar,
}: {
  children: ReactNode
  pending: boolean
  confirmando: boolean
  onPedirConfirmar: () => void
  onCancelarConfirmar: () => void
  onConfirmar: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-silver-200 px-3 py-2 text-sm dark:border-border">
      <span className="min-w-0 text-navy-800 dark:text-foreground">{children}</span>
      {confirmando ? (
        <span className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={pending}
            className="text-xs font-semibold text-estado-rechazo"
          >
            Confirmar
          </button>
          <button type="button" onClick={onCancelarConfirmar} className="text-xs text-silver-600">
            Cancelar
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={onPedirConfirmar}
          className="shrink-0 text-xs font-medium text-silver-600 hover:text-estado-rechazo"
        >
          Eliminar
        </button>
      )}
    </li>
  )
}

// ── Bloque personal (1-1) ────────────────────────────────────────────────────

export function PersonalesEditor({
  empleadoId,
  personales,
}: {
  empleadoId: string
  personales: DatosPersonales | null
}) {
  const guardar = useGuardarPersonales()
  const [abierto, setAbierto] = useState(false)
  const [fechaExpedicion, setFechaExpedicion] = useState(personales?.fechaExpedicion ?? "")
  const [lugarExpedicion, setLugarExpedicion] = useState(personales?.lugarExpedicion ?? "")
  const [fechaNacimiento, setFechaNacimiento] = useState(personales?.fechaNacimiento ?? "")
  const [lugarNacimiento, setLugarNacimiento] = useState(personales?.lugarNacimiento ?? "")
  const [genero, setGenero] = useState<Genero | "">(personales?.genero ?? "")
  const [direccion, setDireccion] = useState(personales?.direccion ?? "")
  const [barrio, setBarrio] = useState(personales?.barrio ?? "")
  const [municipio, setMunicipio] = useState(personales?.municipio ?? "")
  const [correoPersonal, setCorreoPersonal] = useState(personales?.correoPersonal ?? "")
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setError(null)
    try {
      await guardar.mutateAsync({
        id: empleadoId,
        input: {
          fechaExpedicion: fechaExpedicion || null,
          lugarExpedicion: lugarExpedicion.trim() || null,
          fechaNacimiento: fechaNacimiento || null,
          lugarNacimiento: lugarNacimiento.trim() || null,
          genero: genero || null,
          direccion: direccion.trim() || null,
          barrio: barrio.trim() || null,
          municipio: municipio.trim() || null,
          correoPersonal: correoPersonal.trim() || null,
        },
      })
      toast.success("Datos personales actualizados.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudieron guardar los datos personales."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar datos personales</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className={labelCls}>
          <span className={labelTextCls}>Fecha de expedición</span>
          <input
            type="date"
            value={fechaExpedicion}
            onChange={(ev) => setFechaExpedicion(ev.target.value)}
            disabled={guardar.isPending}
            className={inputCls}
          />
        </label>
        <input
          value={lugarExpedicion}
          maxLength={160}
          onChange={(ev) => setLugarExpedicion(ev.target.value)}
          placeholder="Lugar de expedición"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <label className={labelCls}>
          <span className={labelTextCls}>Fecha de nacimiento</span>
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(ev) => setFechaNacimiento(ev.target.value)}
            disabled={guardar.isPending}
            className={inputCls}
          />
        </label>
        <input
          value={lugarNacimiento}
          maxLength={160}
          onChange={(ev) => setLugarNacimiento(ev.target.value)}
          placeholder="Lugar de nacimiento"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <select
          value={genero}
          onChange={(ev) => setGenero(ev.target.value as Genero | "")}
          disabled={guardar.isPending}
          className={inputCls}
        >
          <option value="">Género (sin especificar)</option>
          {GENEROS.map((g) => (
            <option key={g} value={g}>
              {GENERO_LABEL[g]}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={correoPersonal}
          maxLength={200}
          onChange={(ev) => setCorreoPersonal(ev.target.value)}
          placeholder="Correo personal"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={direccion}
          maxLength={200}
          onChange={(ev) => setDireccion(ev.target.value)}
          placeholder="Dirección"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={barrio}
          maxLength={120}
          onChange={(ev) => setBarrio(ev.target.value)}
          placeholder="Barrio"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={municipio}
          maxLength={120}
          onChange={(ev) => setMunicipio(ev.target.value)}
          placeholder="Municipio"
          disabled={guardar.isPending}
          className={inputCls}
        />
      </div>
      <FilaGuardarCancelar
        pending={guardar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}

// ── Familia (1-N) ─────────────────────────────────────────────────────────────

export function FamiliaEditor({
  empleadoId,
  familiares,
}: {
  empleadoId: string
  familiares: Familiar[]
}) {
  const crear = useCrearFamiliar()
  const eliminar = useEliminarFamiliar()
  const [abierto, setAbierto] = useState(false)
  const [parentesco, setParentesco] = useState<Parentesco>("HIJO")
  const [nombre, setNombre] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState("")
  const [genero, setGenero] = useState<Genero | "">("")
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)

  async function agregar() {
    setError(null)
    if (nombre.trim().length < 2) {
      setError("Indica el nombre del familiar.")
      return
    }
    try {
      await crear.mutateAsync({
        id: empleadoId,
        input: {
          parentesco,
          nombre: nombre.trim(),
          ...(fechaNacimiento ? { fechaNacimiento } : {}),
          ...(genero ? { genero } : {}),
        },
      })
      toast.success("Familiar agregado.")
      setNombre("")
      setFechaNacimiento("")
      setGenero("")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar el familiar."))
    }
  }

  async function confirmarEliminar(id: string) {
    try {
      await eliminar.mutateAsync({ id: empleadoId, familiarId: id })
      toast.success("Familiar eliminado.")
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo eliminar el familiar."))
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <div>
      {familiares.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {familiares.map((f) => (
            <FilaEliminable
              key={f.id}
              pending={eliminar.isPending}
              confirmando={aEliminar === f.id}
              onPedirConfirmar={() => setAEliminar(f.id)}
              onCancelarConfirmar={() => setAEliminar(null)}
              onConfirmar={() => void confirmarEliminar(f.id)}
            >
              {f.nombre} <span className="text-silver-600">· {PARENTESCO_LABEL[f.parentesco]}</span>
            </FilaEliminable>
          ))}
        </ul>
      )}

      {!abierto ? (
        <BotonAbrir onClick={() => setAbierto(true)}>Agregar familiar</BotonAbrir>
      ) : (
        <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={parentesco}
              onChange={(ev) => setParentesco(ev.target.value as Parentesco)}
              disabled={crear.isPending}
              className={inputCls}
            >
              {PARENTESCOS.map((p) => (
                <option key={p} value={p}>
                  {PARENTESCO_LABEL[p]}
                </option>
              ))}
            </select>
            <input
              value={nombre}
              maxLength={160}
              onChange={(ev) => setNombre(ev.target.value)}
              placeholder="Nombre completo"
              disabled={crear.isPending}
              className={inputCls}
            />
            <label className={labelCls}>
              <span className={labelTextCls}>Fecha de nacimiento (opcional)</span>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(ev) => setFechaNacimiento(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </label>
            <select
              value={genero}
              onChange={(ev) => setGenero(ev.target.value as Genero | "")}
              disabled={crear.isPending}
              className={inputCls}
            >
              <option value="">Género (sin especificar)</option>
              {GENEROS.map((g) => (
                <option key={g} value={g}>
                  {GENERO_LABEL[g]}
                </option>
              ))}
            </select>
          </div>
          <FilaGuardarCancelar
            pending={crear.isPending}
            guardandoLabel="Agregando…"
            guardarLabel="Agregar"
            onGuardar={() => void agregar()}
            onCancelar={() => setAbierto(false)}
          />
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Formación académica (1-N) ─────────────────────────────────────────────────

export function FormacionEditor({
  empleadoId,
  formacion,
}: {
  empleadoId: string
  formacion: Formacion[]
}) {
  const crear = useCrearFormacion()
  const eliminar = useEliminarFormacion()
  const [abierto, setAbierto] = useState(false)
  const [nivel, setNivel] = useState<NivelFormacion>("PROFESIONAL")
  const [titulo, setTitulo] = useState("")
  const [institucion, setInstitucion] = useState("")
  const [anioInicio, setAnioInicio] = useState("")
  const [anioFin, setAnioFin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)

  async function agregar() {
    setError(null)
    if (titulo.trim().length < 2) {
      setError("Indica el título obtenido.")
      return
    }
    try {
      await crear.mutateAsync({
        id: empleadoId,
        input: {
          nivel,
          titulo: titulo.trim(),
          ...(institucion.trim() ? { institucion: institucion.trim() } : {}),
          ...(anioInicio ? { anioInicio: Number(anioInicio) } : {}),
          ...(anioFin ? { anioFin: Number(anioFin) } : {}),
        },
      })
      toast.success("Formación agregada.")
      setTitulo("")
      setInstitucion("")
      setAnioInicio("")
      setAnioFin("")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar la formación."))
    }
  }

  async function confirmarEliminar(id: string) {
    try {
      await eliminar.mutateAsync({ id: empleadoId, formacionId: id })
      toast.success("Registro de formación eliminado.")
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo eliminar el registro."))
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <div>
      {formacion.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {formacion.map((f) => (
            <FilaEliminable
              key={f.id}
              pending={eliminar.isPending}
              confirmando={aEliminar === f.id}
              onPedirConfirmar={() => setAEliminar(f.id)}
              onCancelarConfirmar={() => setAEliminar(null)}
              onConfirmar={() => void confirmarEliminar(f.id)}
            >
              {f.titulo} <span className="text-silver-600">· {NIVEL_FORMACION_LABEL[f.nivel]}</span>
            </FilaEliminable>
          ))}
        </ul>
      )}

      {!abierto ? (
        <BotonAbrir onClick={() => setAbierto(true)}>Agregar formación</BotonAbrir>
      ) : (
        <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={nivel}
              onChange={(ev) => setNivel(ev.target.value as NivelFormacion)}
              disabled={crear.isPending}
              className={inputCls}
            >
              {NIVELES_FORMACION.map((n) => (
                <option key={n} value={n}>
                  {NIVEL_FORMACION_LABEL[n]}
                </option>
              ))}
            </select>
            <input
              value={titulo}
              maxLength={200}
              onChange={(ev) => setTitulo(ev.target.value)}
              placeholder="Título obtenido"
              disabled={crear.isPending}
              className={inputCls}
            />
            <input
              value={institucion}
              maxLength={200}
              onChange={(ev) => setInstitucion(ev.target.value)}
              placeholder="Institución (opcional)"
              disabled={crear.isPending}
              className={inputCls}
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={anioInicio}
                min={1900}
                max={2100}
                onChange={(ev) => setAnioInicio(ev.target.value)}
                placeholder="Año inicio"
                disabled={crear.isPending}
                className={inputCls}
              />
              <input
                type="number"
                value={anioFin}
                min={1900}
                max={2100}
                onChange={(ev) => setAnioFin(ev.target.value)}
                placeholder="Año fin"
                disabled={crear.isPending}
                className={inputCls}
              />
            </div>
          </div>
          <FilaGuardarCancelar
            pending={crear.isPending}
            guardandoLabel="Agregando…"
            guardarLabel="Agregar"
            onGuardar={() => void agregar()}
            onCancelar={() => setAbierto(false)}
          />
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Experiencia laboral (1-N) ─────────────────────────────────────────────────

export function ExperienciaEditor({
  empleadoId,
  experiencia,
}: {
  empleadoId: string
  experiencia: Experiencia[]
}) {
  const crear = useCrearExperiencia()
  const eliminar = useEliminarExperiencia()
  const [abierto, setAbierto] = useState(false)
  const [empresa, setEmpresa] = useState("")
  const [cargo, setCargo] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)

  async function agregar() {
    setError(null)
    if (empresa.trim().length < 2 || cargo.trim().length < 2) {
      setError("Indica la empresa y el cargo.")
      return
    }
    try {
      await crear.mutateAsync({
        id: empleadoId,
        input: {
          empresa: empresa.trim(),
          cargo: cargo.trim(),
          ...(fechaInicio ? { fechaInicio } : {}),
          ...(fechaFin ? { fechaFin } : {}),
          ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        },
      })
      toast.success("Experiencia agregada.")
      setEmpresa("")
      setCargo("")
      setFechaInicio("")
      setFechaFin("")
      setDescripcion("")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo agregar la experiencia."))
    }
  }

  async function confirmarEliminar(id: string) {
    try {
      await eliminar.mutateAsync({ id: empleadoId, experienciaId: id })
      toast.success("Registro de experiencia eliminado.")
    } catch (e) {
      toast.error(mensajeError(e, "No se pudo eliminar el registro."))
    } finally {
      setAEliminar(null)
    }
  }

  return (
    <div>
      {experiencia.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {experiencia.map((x) => (
            <FilaEliminable
              key={x.id}
              pending={eliminar.isPending}
              confirmando={aEliminar === x.id}
              onPedirConfirmar={() => setAEliminar(x.id)}
              onCancelarConfirmar={() => setAEliminar(null)}
              onConfirmar={() => void confirmarEliminar(x.id)}
            >
              {x.cargo} <span className="text-silver-600">· {x.empresa}</span>
            </FilaEliminable>
          ))}
        </ul>
      )}

      {!abierto ? (
        <BotonAbrir onClick={() => setAbierto(true)}>Agregar experiencia</BotonAbrir>
      ) : (
        <div className="space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={empresa}
              maxLength={200}
              onChange={(ev) => setEmpresa(ev.target.value)}
              placeholder="Empresa"
              disabled={crear.isPending}
              className={inputCls}
            />
            <input
              value={cargo}
              maxLength={160}
              onChange={(ev) => setCargo(ev.target.value)}
              placeholder="Cargo"
              disabled={crear.isPending}
              className={inputCls}
            />
            <label className={labelCls}>
              <span className={labelTextCls}>Fecha inicio</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(ev) => setFechaInicio(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              <span className={labelTextCls}>Fecha fin (vacío = actual)</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(ev) => setFechaFin(ev.target.value)}
                disabled={crear.isPending}
                className={inputCls}
              />
            </label>
          </div>
          <textarea
            value={descripcion}
            onChange={(ev) => setDescripcion(ev.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            maxLength={1000}
            disabled={crear.isPending}
            className={`${inputCls} w-full resize-none`}
          />
          <FilaGuardarCancelar
            pending={crear.isPending}
            guardandoLabel="Agregando…"
            guardarLabel="Agregar"
            onGuardar={() => void agregar()}
            onCancelar={() => setAbierto(false)}
          />
          {error && <p className="text-xs text-estado-rechazo">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ── Bloque contractual extendido (1-1) ────────────────────────────────────────

export function ContractualEditor({
  empleadoId,
  contractual,
}: {
  empleadoId: string
  contractual: EmpleadoContractual
}) {
  const editar = useEditarContractual()
  const { data: areas } = useAreas()
  const [abierto, setAbierto] = useState(false)
  const [areaId, setAreaId] = useState(contractual.areaId ?? "")
  const [tipoContrato, setTipoContrato] = useState<TipoContrato | "">(contractual.tipoContrato ?? "")
  const [modalidad, setModalidad] = useState<Modalidad | "">(contractual.modalidad ?? "")
  const [programa, setPrograma] = useState(contractual.programa ?? "")
  const [escalafon, setEscalafon] = useState(contractual.escalafon ?? "")
  const [jefeInmediato, setJefeInmediato] = useState(contractual.jefeInmediato ?? "")
  const [fechaPrimerIngreso, setFechaPrimerIngreso] = useState(contractual.fechaPrimerIngreso ?? "")
  const [observacion, setObservacion] = useState(contractual.observacion ?? "")
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setError(null)
    try {
      await editar.mutateAsync({
        id: empleadoId,
        input: {
          areaId: areaId || null,
          tipoContrato: tipoContrato || null,
          modalidad: modalidad || null,
          programa: programa.trim() || null,
          escalafon: escalafon.trim() || null,
          jefeInmediato: jefeInmediato.trim() || null,
          fechaPrimerIngreso: fechaPrimerIngreso || null,
          observacion: observacion.trim() || null,
        },
      })
      toast.success("Datos contractuales actualizados.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudieron guardar los datos contractuales."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar datos contractuales</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-silver-300 p-3 dark:border-border">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={areaId}
          onChange={(ev) => setAreaId(ev.target.value)}
          disabled={editar.isPending}
          className={inputCls}
        >
          <option value="">Área (sin asignar)</option>
          {(areas ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <select
          value={tipoContrato}
          onChange={(ev) => setTipoContrato(ev.target.value as TipoContrato | "")}
          disabled={editar.isPending}
          className={inputCls}
        >
          <option value="">Tipo de contrato (sin especificar)</option>
          {TIPOS_CONTRATO.map((t) => (
            <option key={t} value={t}>
              {TIPO_CONTRATO_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={modalidad}
          onChange={(ev) => setModalidad(ev.target.value as Modalidad | "")}
          disabled={editar.isPending}
          className={inputCls}
        >
          <option value="">Modalidad (sin especificar)</option>
          {MODALIDADES.map((m) => (
            <option key={m} value={m}>
              {MODALIDAD_LABEL[m]}
            </option>
          ))}
        </select>
        <label className={labelCls}>
          <span className={labelTextCls}>Fecha de primer ingreso</span>
          <input
            type="date"
            value={fechaPrimerIngreso}
            onChange={(ev) => setFechaPrimerIngreso(ev.target.value)}
            disabled={editar.isPending}
            className={inputCls}
          />
        </label>
        <input
          value={jefeInmediato}
          maxLength={160}
          onChange={(ev) => setJefeInmediato(ev.target.value)}
          placeholder="Jefe inmediato"
          disabled={editar.isPending}
          className={inputCls}
        />
        <input
          value={programa}
          maxLength={160}
          onChange={(ev) => setPrograma(ev.target.value)}
          placeholder="Programa"
          disabled={editar.isPending}
          className={inputCls}
        />
        <input
          value={escalafon}
          maxLength={80}
          onChange={(ev) => setEscalafon(ev.target.value)}
          placeholder="Escalafón"
          disabled={editar.isPending}
          className={inputCls}
        />
      </div>
      <textarea
        value={observacion}
        onChange={(ev) => setObservacion(ev.target.value)}
        placeholder="Observación (opcional)"
        rows={2}
        maxLength={1000}
        disabled={editar.isPending}
        className={`${inputCls} w-full resize-none`}
      />
      <FilaGuardarCancelar
        pending={editar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}

// ── Bloque salarial (1-1, SENSIBLE) ───────────────────────────────────────────

export function SalarialEditor({
  empleadoId,
  salarial,
}: {
  empleadoId: string
  salarial: DatosSalariales | null
}) {
  const guardar = useGuardarSalarial()
  const [abierto, setAbierto] = useState(false)
  const [salarioBasico, setSalarioBasico] = useState(salarial?.salarioBasico?.toString() ?? "")
  const [auxilioTransporte, setAuxilioTransporte] = useState(
    salarial?.auxilioTransporte?.toString() ?? "",
  )
  const [promedioDevengado, setPromedioDevengado] = useState(
    salarial?.promedioDevengado?.toString() ?? "",
  )
  const [honorarios, setHonorarios] = useState(salarial?.honorarios?.toString() ?? "")
  const [valorEnLetras, setValorEnLetras] = useState(salarial?.valorEnLetras ?? "")
  const [eps, setEps] = useState(salarial?.eps ?? "")
  const [afp, setAfp] = useState(salarial?.afp ?? "")
  const [error, setError] = useState<string | null>(null)

  async function confirmar() {
    setError(null)
    try {
      await guardar.mutateAsync({
        id: empleadoId,
        input: {
          salarioBasico: salarioBasico === "" ? null : Number(salarioBasico),
          auxilioTransporte: auxilioTransporte === "" ? null : Number(auxilioTransporte),
          promedioDevengado: promedioDevengado === "" ? null : Number(promedioDevengado),
          honorarios: honorarios === "" ? null : Number(honorarios),
          valorEnLetras: valorEnLetras.trim() || null,
          eps: eps.trim() || null,
          afp: afp.trim() || null,
        },
      })
      toast.success("Información salarial actualizada.")
      setAbierto(false)
    } catch (e) {
      setError(mensajeError(e, "No se pudo guardar la información salarial."))
    }
  }

  if (!abierto) {
    return <BotonAbrir onClick={() => setAbierto(true)}>Editar información salarial</BotonAbrir>
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gold-200/60 bg-gold-50/40 p-3 dark:border-gold-200/20 dark:bg-surface-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="number"
          min={0}
          value={salarioBasico}
          onChange={(ev) => setSalarioBasico(ev.target.value)}
          placeholder="Salario básico"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={auxilioTransporte}
          onChange={(ev) => setAuxilioTransporte(ev.target.value)}
          placeholder="Auxilio de transporte"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={promedioDevengado}
          onChange={(ev) => setPromedioDevengado(ev.target.value)}
          placeholder="Promedio devengado"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          type="number"
          min={0}
          value={honorarios}
          onChange={(ev) => setHonorarios(ev.target.value)}
          placeholder="Honorarios (OPS)"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={eps}
          maxLength={120}
          onChange={(ev) => setEps(ev.target.value)}
          placeholder="EPS"
          disabled={guardar.isPending}
          className={inputCls}
        />
        <input
          value={afp}
          maxLength={120}
          onChange={(ev) => setAfp(ev.target.value)}
          placeholder="AFP"
          disabled={guardar.isPending}
          className={inputCls}
        />
      </div>
      <input
        value={valorEnLetras}
        maxLength={200}
        onChange={(ev) => setValorEnLetras(ev.target.value)}
        placeholder="Valor en letras (opcional)"
        disabled={guardar.isPending}
        className={`${inputCls} w-full`}
      />
      <FilaGuardarCancelar
        pending={guardar.isPending}
        onGuardar={() => void confirmar()}
        onCancelar={() => setAbierto(false)}
      />
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
    </div>
  )
}

// ── Foto (Storage) ────────────────────────────────────────────────────────────

const EXTENSIONES_ACEPTADAS = "image/jpeg,image/png,image/webp"

export function FotoEditor({
  empleadoId,
  nombre,
  tieneFoto,
}: {
  empleadoId: string
  nombre: string
  tieneFoto: boolean
}) {
  const { data: foto, isLoading } = useFotoUrl(empleadoId, tieneFoto)
  const subir = useSubirFoto(empleadoId)
  const eliminar = useEliminarFoto()
  const [error, setError] = useState<string | null>(null)
  const pending = subir.isPending || eliminar.isPending

  async function manejarArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    try {
      await subir.mutateAsync(archivo)
      toast.success("Foto actualizada.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.")
    }
  }

  async function quitar() {
    setError(null)
    try {
      await eliminar.mutateAsync(empleadoId)
      toast.success("Foto eliminada.")
    } catch (e) {
      setError(mensajeError(e, "No se pudo eliminar la foto."))
    }
  }

  return (
    <div className="flex items-start gap-3">
      {tieneFoto && foto?.url ? (
        <img
          src={foto.url}
          alt={nombre}
          className="h-14 w-14 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-gold-200/60"
        />
      ) : (
        <Avatar nombre={nombre} size="lg" />
      )}
      <div className="flex flex-col gap-1">
        <label className="cursor-pointer text-xs font-semibold text-navy-700 hover:text-gold-600 dark:text-foreground">
          {isLoading && tieneFoto ? "Cargando…" : pending ? "Subiendo…" : "Cambiar foto"}
          <input
            type="file"
            accept={EXTENSIONES_ACEPTADAS}
            className="hidden"
            disabled={pending}
            onChange={(ev) => void manejarArchivo(ev.target.files?.[0])}
          />
        </label>
        {tieneFoto && (
          <button
            type="button"
            onClick={() => void quitar()}
            disabled={pending}
            className="text-left text-xs font-medium text-silver-600 hover:text-estado-rechazo"
          >
            Quitar foto
          </button>
        )}
        {error && <p className="max-w-[12rem] text-xs text-estado-rechazo">{error}</p>}
      </div>
    </div>
  )
}
