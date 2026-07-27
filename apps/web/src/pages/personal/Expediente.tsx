import {
  estadoVinculacion,
  TIPO_VINCULACION_BADGE,
  TIPO_VINCULACION_LABEL,
} from "@pys/shared"
import type { Empleado, ExpedienteCompleto } from "@pys/shared"
import { DetalleModalLayout, Seccion } from "../../components/ui/ficha"
import { EstadoVinculacionPill } from "../../components/ui/EstadoPill"
import type { SeccionNav } from "../../components/ui/ficha"
import { AccionesEmpleado } from "./AccionesEmpleado"
import {
  ContractualEditor,
  ExperienciaEditor,
  FamiliaEditor,
  FormacionEditor,
  FotoEditor,
  PersonalesEditor,
  SalarialEditor,
} from "./bloques-editables"
import {
  BloqueContractual,
  BloqueHistorial,
  BloquePersonales,
  BloqueSalarial,
} from "./ExpedienteBloques"

const SECCIONES: readonly SeccionNav[] = [
  { id: "personal", label: "Personales" },
  { id: "familia", label: "Familia" },
  { id: "formacion", label: "Formación" },
  { id: "experiencia", label: "Experiencia" },
  { id: "contractual", label: "Contractual" },
  { id: "salarial", label: "Salarial" },
  { id: "historial", label: "Historial" },
  { id: "acciones", label: "Acciones" },
]

/**
 * Hoja de vida 360° del empleado dentro del modal. Orquestador delgado: compone
 * el layout compartido (identidad con foto + nav pegajosa) con las 8 secciones,
 * cada una con su bloque de lectura + editor de `bloques-editables/`. El bloque
 * salarial se acordona; si el rol no puede verlo llega "restringido".
 */
export function Expediente({ exp }: { exp: ExpedienteCompleto }) {
  const e = exp.empleado
  const vinculo = estadoVinculacion(e)

  return (
    <DetalleModalLayout secciones={SECCIONES} identidad={<IdentidadEmpleado exp={exp} empleado={e} />}>
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
    </DetalleModalLayout>
  )
}

/** Encabezado de identidad: foto editable + nombre + CC/cargo/área + pills de vínculo. */
function IdentidadEmpleado({ exp, empleado: e }: { exp: ExpedienteCompleto; empleado: Empleado }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <FotoEditor empleadoId={e.id} nombre={e.nombreCompleto} tieneFoto={!!exp.contractual.fotoPath} />
      <div className="min-w-0 flex-1">
        <h1
          id="titulo-expediente"
          className="font-display text-2xl font-semibold text-navy-900 dark:text-foreground"
        >
          {e.nombreCompleto}
        </h1>
        <p className="mt-0.5 text-sm text-silver-600 tabular-nums">
          CC {e.documento} · {e.cargo} · {e.areaOrigen}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EstadoVinculacionPill estado={estadoVinculacion(e)} />
          {e.tipoVinculacion && (
            <span className={TIPO_VINCULACION_BADGE[e.tipoVinculacion]}>
              {TIPO_VINCULACION_LABEL[e.tipoVinculacion]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
