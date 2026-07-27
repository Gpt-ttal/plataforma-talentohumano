import {
  formatFecha,
  formatFechaHora,
  formatMoneda,
  GENERO_LABEL,
  MODALIDAD_LABEL,
  NOVEDAD_TIPO_LABEL,
  TIPO_CONTRATO_LABEL,
} from "@pys/shared"
import type {
  DatosPersonales,
  DatosSalariales,
  Empleado,
  EmpleadoContractual,
  Novedad,
} from "@pys/shared"
import { Campos, Campo } from "../../components/ui/ficha"
import { Icon } from "../../components/ui/dash/Icon"

/**
 * Bloques de lectura del expediente 360° (antes funciones inline en la página
 * dedicada, hoy el modal `Expediente`). Solo presentación de datos ya cargados;
 * la captura vive en los editores de `bloques-editables/`. Cohesivos por módulo (YAGNI).
 */

/** Vacío por bloque: mensaje sobrio + hint de cómo poblarlo. */
export function VacioBloque({ mensaje }: { mensaje: string }) {
  return <p className="text-sm text-silver-600">{mensaje}</p>
}

export function BloquePersonales({
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

export function BloqueContractual({
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
export function BloqueSalarial({
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
    <div className="rounded-xl border border-hairline bg-surface-2 p-4">
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

export function BloqueHistorial({ novedades }: { novedades: Novedad[] }) {
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
