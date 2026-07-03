import type { ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import {
  estadoVinculacion,
  estadoVinculacionPill,
  formatFecha,
  formatFechaHora,
  formatMoneda,
  GENERO_LABEL,
  MODALIDAD_LABEL,
  NOVEDAD_TIPO_LABEL,
  TIPO_CONTRATO_LABEL,
  TIPO_VINCULACION_BADGE,
  TIPO_VINCULACION_LABEL,
} from "@pys/shared"
import type {
  DatosPersonales,
  DatosSalariales,
  Empleado,
  EmpleadoContractual,
  ExpedienteCompleto,
  Novedad,
} from "@pys/shared"
import { useExpediente } from "../../hooks/usePersonal"
import { EmptyState } from "../../components/ui/EmptyState"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { Icon } from "../../components/ui/dash/Icon"
import type { IconName } from "../../components/ui/dash/Icon"
import { AccionesEmpleado } from "./AccionesEmpleado"
import {
  ContractualEditor,
  ExperienciaEditor,
  FamiliaEditor,
  FormacionEditor,
  FotoEditor,
  PersonalesEditor,
  SalarialEditor,
} from "./BloquesEditables"

/**
 * Expediente 360° del empleado (hoja de vida completa): header pegajoso con
 * identidad + navegación por secciones, y una sección por bloque satélite. El
 * bloque salarial se acordona; si el rol no puede verlo llega "restringido".
 * Ruta propia `/personal/:id` (reemplaza el modal de ficha rápida).
 */
export function ExpedientePage() {
  const { id } = useParams()
  const { data, isLoading, isError } = useExpediente(id)

  return (
    <div className="space-y-6">
      <Link
        to="/personal"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-silver-600 transition-colors hover:text-navy-700 dark:hover:text-foreground"
      >
        <Icon name="arrow" className="h-4 w-4 rotate-180" />
        Volver al maestro de empleados
      </Link>

      {isLoading ? (
        <ListaSkeleton filas={6} />
      ) : isError || !data ? (
        <EmptyState
          icono={<Icon name="warning" className="h-6 w-6 text-estado-rechazo" />}
          titulo="No se pudo cargar el expediente"
          mensaje="Hubo un problema al consultar la hoja de vida del empleado. Revisa tu conexión e inténtalo de nuevo."
        />
      ) : (
        <Expediente exp={data} />
      )}
    </div>
  )
}

function Expediente({ exp }: { exp: ExpedienteCompleto }) {
  const e = exp.empleado
  const vinculo = estadoVinculacion(e)
  const { className: pillCls, dot, label } = estadoVinculacionPill(vinculo)

  return (
    <div className="space-y-6">
      {/* Header pegajoso: identidad + navegación por secciones */}
      <header className="premium-card sticky top-2 z-20 rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <FotoEditor empleadoId={e.id} nombre={e.nombreCompleto} tieneFoto={!!exp.contractual.fotoPath} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-navy-900 dark:text-foreground">
              {e.nombreCompleto}
            </h1>
            <p className="mt-0.5 text-sm text-silver-600 tabular-nums">
              CC {e.documento} · {e.cargo} · {e.areaOrigen}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={pillCls}>
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </span>
              {e.tipoVinculacion && (
                <span className={TIPO_VINCULACION_BADGE[e.tipoVinculacion]}>
                  {TIPO_VINCULACION_LABEL[e.tipoVinculacion]}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-silver-200 pt-3 dark:border-border">
          {SECCIONES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full px-3 py-1 text-xs font-medium text-silver-600 transition-colors hover:bg-navy-50 hover:text-navy-700 dark:hover:bg-surface-2 dark:hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <Seccion id="personal" titulo="Datos personales" icono="badge">
        <BloquePersonales personales={exp.personales} empleado={e} />
        <PersonalesEditor empleadoId={e.id} personales={exp.personales} />
      </Seccion>

      <Seccion id="familia" titulo="Familia" icono="users">
        <FamiliaEditor empleadoId={e.id} familiares={exp.familiares} />
      </Seccion>

      <Seccion id="formacion" titulo="Formación académica" icono="grad-cap">
        <FormacionEditor empleadoId={e.id} formacion={exp.formacion} />
      </Seccion>

      <Seccion id="experiencia" titulo="Experiencia laboral" icono="briefcase">
        <ExperienciaEditor empleadoId={e.id} experiencia={exp.experiencia} />
      </Seccion>

      <Seccion id="contractual" titulo="Datos contractuales" icono="file">
        <BloqueContractual contractual={exp.contractual} empleado={e} />
        <ContractualEditor empleadoId={e.id} contractual={exp.contractual} />
      </Seccion>

      <Seccion id="salarial" titulo="Información salarial" icono="coins">
        <BloqueSalarial visible={exp.salarialVisible} salarial={exp.salarial ?? null} />
        {exp.salarialVisible && (
          <SalarialEditor empleadoId={e.id} salarial={exp.salarial ?? null} />
        )}
      </Seccion>

      <Seccion id="historial" titulo="Historial de novedades" icono="clock">
        <BloqueHistorial novedades={exp.novedades} />
      </Seccion>

      {/* Acciones de gestión (SA/TH): actualizar, finalizar contrato, otro sí */}
      <Seccion id="acciones" titulo="Acciones" icono="edit">
        <AccionesEmpleado empleado={e} esActivo={vinculo === "ACTIVO"} />
        {vinculo !== "ACTIVO" && (
          <p className="mt-3 text-sm text-silver-600">
            Este empleado ya está en trámite de Paz y Salvo. El expediente es de
            consulta; el avance del trámite se gestiona en su oficina de Paz y Salvo.
          </p>
        )}
      </Seccion>
    </div>
  )
}

const SECCIONES = [
  { id: "personal", label: "Personales" },
  { id: "familia", label: "Familia" },
  { id: "formacion", label: "Formación" },
  { id: "experiencia", label: "Experiencia" },
  { id: "contractual", label: "Contractual" },
  { id: "salarial", label: "Salarial" },
  { id: "historial", label: "Historial" },
] as const

// ── Contenedor de sección ─────────────────────────────────────────────────────

function Seccion({
  id,
  titulo,
  icono,
  children,
}: {
  id: string
  titulo: string
  icono: IconName
  children: ReactNode
}) {
  return (
    <section id={id} className="premium-card scroll-mt-40 rounded-2xl px-5 py-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-navy-800 dark:text-foreground">
        <Icon name={icono} className="h-4 w-4 text-gold-500" />
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/** Rejilla de datos etiqueta/valor (label micro-uppercase + valor tabular). */
function Campos({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 text-sm md:grid-cols-3">{children}</dl>
  )
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-silver-600">{etiqueta}</dt>
      <dd className="mt-0.5 break-words font-medium text-navy-700 tabular-nums dark:text-foreground">
        {valor || "—"}
      </dd>
    </div>
  )
}

/** Vacío por bloque: mensaje sobrio + hint de cómo poblarlo (captura en Sprint 2). */
function VacioBloque({ mensaje }: { mensaje: string }) {
  return <p className="text-sm text-silver-600">{mensaje}</p>
}

// ── Bloques ───────────────────────────────────────────────────────────────────

function BloquePersonales({
  personales: p,
  empleado: e,
}: {
  personales: DatosPersonales | null
  empleado: Empleado
}) {
  return (
    <Campos>
      <Campo etiqueta="Documento" valor={`CC ${e.documento}`} />
      <Campo etiqueta="Correo institucional" valor={e.correoInstitucional} />
      <Campo etiqueta="Teléfono" valor={e.telefono} />
      <Campo etiqueta="Fecha de nacimiento" valor={formatFecha(p?.fechaNacimiento)} />
      <Campo etiqueta="Lugar de nacimiento" valor={p?.lugarNacimiento} />
      <Campo etiqueta="Género" valor={p?.genero ? GENERO_LABEL[p.genero] : null} />
      <Campo etiqueta="Fecha de expedición" valor={formatFecha(p?.fechaExpedicion)} />
      <Campo etiqueta="Lugar de expedición" valor={p?.lugarExpedicion} />
      <Campo etiqueta="Correo personal" valor={p?.correoPersonal} />
      <Campo etiqueta="Dirección" valor={p?.direccion} />
      <Campo etiqueta="Barrio" valor={p?.barrio} />
      <Campo etiqueta="Municipio" valor={p?.municipio} />
    </Campos>
  )
}

function BloqueContractual({
  contractual: c,
  empleado: e,
}: {
  contractual: EmpleadoContractual
  empleado: Empleado
}) {
  return (
    <Campos>
      <Campo
        etiqueta="Tipo de contrato"
        valor={c.tipoContrato ? TIPO_CONTRATO_LABEL[c.tipoContrato] : null}
      />
      <Campo etiqueta="Modalidad" valor={c.modalidad ? MODALIDAD_LABEL[c.modalidad] : null} />
      <Campo etiqueta="Fecha de ingreso" valor={formatFecha(e.fechaIngreso)} />
      <Campo etiqueta="Primer ingreso" valor={formatFecha(c.fechaPrimerIngreso)} />
      <Campo etiqueta="Fin de contrato" valor={formatFecha(e.fechaFinContrato)} />
      <Campo etiqueta="Jefe inmediato" valor={c.jefeInmediato} />
      <Campo etiqueta="Programa" valor={c.programa} />
      <Campo etiqueta="Escalafón" valor={c.escalafon} />
      <Campo etiqueta="Fecha de retiro" valor={formatFecha(e.fechaRetiro)} />
      {c.observacion && <Campo etiqueta="Observación" valor={c.observacion} />}
    </Campos>
  )
}

/** Bloque salarial acordonado. Si `!visible` → restringido (candado + copy). */
function BloqueSalarial({
  visible,
  salarial: s,
}: {
  visible: boolean
  salarial: DatosSalariales | null
}) {
  if (!visible) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-silver-300 bg-surface-2 px-4 py-6 dark:border-border">
        <Icon name="lock" className="h-5 w-5 shrink-0 text-silver-500" />
        <div>
          <p className="text-sm font-semibold text-navy-800 dark:text-foreground">Información restringida</p>
          <p className="text-sm text-silver-600">
            El bloque salarial y prestacional solo es visible para Talento Humano y
            la administración del sistema.
          </p>
        </div>
      </div>
    )
  }

  if (!s) {
    return <VacioBloque mensaje="Sin información salarial registrada." />
  }

  return (
    <div className="rounded-xl border border-gold-200/60 bg-gold-50/40 p-4 dark:border-gold-200/20 dark:bg-surface-2">
      <Campos>
        <Campo etiqueta="Salario básico" valor={formatMoneda(s.salarioBasico)} />
        <Campo etiqueta="Auxilio de transporte" valor={formatMoneda(s.auxilioTransporte)} />
        <Campo etiqueta="Promedio devengado" valor={formatMoneda(s.promedioDevengado)} />
        <Campo etiqueta="Honorarios (OPS)" valor={formatMoneda(s.honorarios)} />
        <Campo etiqueta="EPS" valor={s.eps} />
        <Campo etiqueta="AFP" valor={s.afp} />
        {s.valorEnLetras && <Campo etiqueta="Valor en letras" valor={s.valorEnLetras} />}
      </Campos>
    </div>
  )
}

function BloqueHistorial({ novedades }: { novedades: Novedad[] }) {
  if (novedades.length === 0) {
    return <VacioBloque mensaje="Sin novedades registradas." />
  }
  return (
    <ul className="space-y-2">
      {novedades.map((n) => (
        <li key={n.id} className="rounded-lg border border-silver-200 px-3 py-2 text-sm dark:border-border">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-navy-800 dark:text-foreground">
              {NOVEDAD_TIPO_LABEL[n.tipo]}
            </span>
            <span className="text-xs text-silver-600">{formatFechaHora(n.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-silver-700 dark:text-muted">{n.motivo}</p>
          {n.valorAnterior && n.valorNuevo && (
            <p className="mt-0.5 text-xs text-silver-600">
              {n.valorAnterior} → {n.valorNuevo}
            </p>
          )}
          <p className="mt-0.5 text-xs text-silver-600">Registrado por {n.autor}</p>
        </li>
      ))}
    </ul>
  )
}
