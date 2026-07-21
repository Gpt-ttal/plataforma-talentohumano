import { and, asc, desc, eq } from "drizzle-orm"
import type {
  CrearExperienciaInput,
  CrearFamiliarInput,
  CrearFormacionInput,
  DatosPersonales,
  DatosSalariales,
  EditarContractualInput,
  EmpleadoContractual,
  ExpedienteCompleto,
  Experiencia,
  Familiar,
  Formacion,
  GuardarPersonalesInput,
  GuardarSalarialInput,
} from "@pys/shared"
import type { FuncionarioRepo } from "../../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado } from "../../../application/errors.js"
import { db } from "../client.js"
import {
  empleadoExperiencia,
  empleadoFamiliares,
  empleadoFormacion,
  empleadoPersonales,
  empleadoSalarial,
  funcionarios,
  novedades,
} from "../schema.js"
import { mapEmpleado, mapNovedad } from "./mappers.compartidos.js"

// ── Mappers de la hoja de vida 360° (exclusivos de este bloque) ────────────

type FuncionarioRow = typeof funcionarios.$inferSelect

/** Bloque contractual extendido (columnas nuevas de `funcionarios`, no sensible). */
function mapContractual(r: FuncionarioRow): EmpleadoContractual {
  return {
    areaId: r.areaId ?? null,
    tipoContrato: r.tipoContrato ?? null,
    modalidad: r.modalidad ?? null,
    programa: r.programa ?? null,
    escalafon: r.escalafon ?? null,
    jefeInmediato: r.jefeInmediato ?? null,
    fechaPrimerIngreso: r.fechaPrimerIngreso ?? null,
    observacion: r.observacion ?? null,
    fotoPath: r.fotoPath ?? null,
  }
}

type PersonalesRow = typeof empleadoPersonales.$inferSelect
type FamiliarRow = typeof empleadoFamiliares.$inferSelect
type FormacionRow = typeof empleadoFormacion.$inferSelect
type ExperienciaRow = typeof empleadoExperiencia.$inferSelect
type SalarialRow = typeof empleadoSalarial.$inferSelect

/** `numeric` de pg vuelve como string; lo convertimos a número (o null). */
function numOrNull(v: string | null): number | null {
  return v === null || v === undefined ? null : Number(v)
}

/** Dirección inversa: `numeric` de pg se escribe como string. */
function numAString(v: number | null): string | null {
  return v === null ? null : String(v)
}

function mapPersonales(r: PersonalesRow): DatosPersonales {
  return {
    fechaExpedicion: r.fechaExpedicion ?? null,
    lugarExpedicion: r.lugarExpedicion ?? null,
    fechaNacimiento: r.fechaNacimiento ?? null,
    lugarNacimiento: r.lugarNacimiento ?? null,
    genero: r.genero ?? null,
    direccion: r.direccion ?? null,
    barrio: r.barrio ?? null,
    municipio: r.municipio ?? null,
    correoPersonal: r.correoPersonal ?? null,
  }
}

function mapFamiliar(r: FamiliarRow): Familiar {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    parentesco: r.parentesco,
    nombre: r.nombre,
    fechaNacimiento: r.fechaNacimiento ?? null,
    genero: r.genero ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function mapFormacion(r: FormacionRow): Formacion {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    nivel: r.nivel,
    titulo: r.titulo,
    institucion: r.institucion ?? null,
    anioInicio: r.anioInicio ?? null,
    anioFin: r.anioFin ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function mapExperiencia(r: ExperienciaRow): Experiencia {
  return {
    id: r.id,
    funcionarioId: r.funcionarioId,
    empresa: r.empresa,
    cargo: r.cargo,
    fechaInicio: r.fechaInicio ?? null,
    fechaFin: r.fechaFin ?? null,
    descripcion: r.descripcion ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function mapSalarial(r: SalarialRow): DatosSalariales {
  return {
    salarioBasico: numOrNull(r.salarioBasico),
    auxilioTransporte: numOrNull(r.auxilioTransporte),
    promedioDevengado: numOrNull(r.promedioDevengado),
    valorEnLetras: r.valorEnLetras ?? null,
    honorarios: numOrNull(r.honorarios),
    eps: r.eps ?? null,
    afp: r.afp ?? null,
  }
}

/** 404 homogéneo para las mutaciones de bloque satélite (el empleado debe existir). */
async function assertEmpleadoExiste(id: string): Promise<void> {
  const [row] = await db
    .select({ id: funcionarios.id })
    .from(funcionarios)
    .where(eq(funcionarios.id, id))
    .limit(1)
  if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
}

// ── Hoja de vida 360°: expediente completo + captura por bloque satélite ───
//
// `obtenerExpediente` vive aquí (no en `empleadoRepo`) porque su dependencia
// real es este bloque: 6 de sus 7 mappers son exclusivos de la hoja de vida
// 360°; solo `mapEmpleado`/`mapNovedad` (núcleo) vienen de `mappers.compartidos`.

export const expedienteRepo: Pick<
  FuncionarioRepo,
  | "obtenerExpediente"
  | "guardarPersonales"
  | "crearFamiliar"
  | "eliminarFamiliar"
  | "crearFormacion"
  | "eliminarFormacion"
  | "crearExperiencia"
  | "eliminarExperiencia"
  | "guardarSalarial"
  | "editarContractual"
  | "guardarFotoPath"
  | "obtenerFotoPath"
> = {
  async obtenerExpediente(
    id: string,
    incluyeSalarial: boolean,
  ): Promise<ExpedienteCompleto | null> {
    const [row] = await db
      .select()
      .from(funcionarios)
      .where(eq(funcionarios.id, id))
      .limit(1)
    if (!row) return null

    const [persRows, famRows, formRows, expRows, novRows] = await Promise.all([
      db.select().from(empleadoPersonales).where(eq(empleadoPersonales.funcionarioId, id)).limit(1),
      db
        .select()
        .from(empleadoFamiliares)
        .where(eq(empleadoFamiliares.funcionarioId, id))
        .orderBy(asc(empleadoFamiliares.createdAt)),
      db
        .select()
        .from(empleadoFormacion)
        .where(eq(empleadoFormacion.funcionarioId, id))
        .orderBy(desc(empleadoFormacion.anioFin)),
      db
        .select()
        .from(empleadoExperiencia)
        .where(eq(empleadoExperiencia.funcionarioId, id))
        .orderBy(desc(empleadoExperiencia.fechaInicio)),
      db.select().from(novedades).where(eq(novedades.funcionarioId, id)).orderBy(desc(novedades.createdAt)),
    ])

    const expediente: ExpedienteCompleto = {
      empleado: mapEmpleado(row),
      contractual: mapContractual(row),
      personales: persRows[0] ? mapPersonales(persRows[0]) : null,
      familiares: famRows.map(mapFamiliar),
      formacion: formRows.map(mapFormacion),
      experiencia: expRows.map(mapExperiencia),
      novedades: novRows.map(mapNovedad),
      salarialVisible: incluyeSalarial,
    }

    if (incluyeSalarial) {
      const [salRow] = await db
        .select()
        .from(empleadoSalarial)
        .where(eq(empleadoSalarial.funcionarioId, id))
        .limit(1)
      expediente.salarial = salRow ? mapSalarial(salRow) : null
    }

    return expediente
  },

  async guardarPersonales(
    id: string,
    datos: GuardarPersonalesInput,
  ): Promise<DatosPersonales> {
    await assertEmpleadoExiste(id)
    const patch: Partial<typeof empleadoPersonales.$inferInsert> = {}
    if (datos.fechaExpedicion !== undefined) patch.fechaExpedicion = datos.fechaExpedicion
    if (datos.lugarExpedicion !== undefined) patch.lugarExpedicion = datos.lugarExpedicion
    if (datos.fechaNacimiento !== undefined) patch.fechaNacimiento = datos.fechaNacimiento
    if (datos.lugarNacimiento !== undefined) patch.lugarNacimiento = datos.lugarNacimiento
    if (datos.genero !== undefined) patch.genero = datos.genero
    if (datos.direccion !== undefined) patch.direccion = datos.direccion
    if (datos.barrio !== undefined) patch.barrio = datos.barrio
    if (datos.municipio !== undefined) patch.municipio = datos.municipio
    if (datos.correoPersonal !== undefined) patch.correoPersonal = datos.correoPersonal

    const [row] = await db
      .insert(empleadoPersonales)
      .values({ funcionarioId: id, ...patch })
      .onConflictDoUpdate({
        target: empleadoPersonales.funcionarioId,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error("guardarPersonales: el upsert no devolvió la fila.")
    return mapPersonales(row)
  },

  async crearFamiliar(id: string, datos: CrearFamiliarInput): Promise<Familiar> {
    await assertEmpleadoExiste(id)
    const [row] = await db
      .insert(empleadoFamiliares)
      .values({
        funcionarioId: id,
        parentesco: datos.parentesco,
        nombre: datos.nombre,
        fechaNacimiento: datos.fechaNacimiento ?? null,
        genero: datos.genero ?? null,
      })
      .returning()
    if (!row) throw new Error("crearFamiliar: la inserción no devolvió el familiar.")
    return mapFamiliar(row)
  },

  async eliminarFamiliar(id: string, familiarId: string): Promise<void> {
    const borrados = await db
      .delete(empleadoFamiliares)
      .where(and(eq(empleadoFamiliares.id, familiarId), eq(empleadoFamiliares.funcionarioId, id)))
      .returning({ id: empleadoFamiliares.id })
    if (borrados.length === 0) throw new ErrorNoEncontrado("El familiar no existe.")
  },

  async crearFormacion(id: string, datos: CrearFormacionInput): Promise<Formacion> {
    await assertEmpleadoExiste(id)
    const [row] = await db
      .insert(empleadoFormacion)
      .values({
        funcionarioId: id,
        nivel: datos.nivel,
        titulo: datos.titulo,
        institucion: datos.institucion ?? null,
        anioInicio: datos.anioInicio ?? null,
        anioFin: datos.anioFin ?? null,
      })
      .returning()
    if (!row) throw new Error("crearFormacion: la inserción no devolvió el registro.")
    return mapFormacion(row)
  },

  async eliminarFormacion(id: string, formacionId: string): Promise<void> {
    const borrados = await db
      .delete(empleadoFormacion)
      .where(and(eq(empleadoFormacion.id, formacionId), eq(empleadoFormacion.funcionarioId, id)))
      .returning({ id: empleadoFormacion.id })
    if (borrados.length === 0) throw new ErrorNoEncontrado("El registro de formación no existe.")
  },

  async crearExperiencia(id: string, datos: CrearExperienciaInput): Promise<Experiencia> {
    await assertEmpleadoExiste(id)
    const [row] = await db
      .insert(empleadoExperiencia)
      .values({
        funcionarioId: id,
        empresa: datos.empresa,
        cargo: datos.cargo,
        fechaInicio: datos.fechaInicio ?? null,
        fechaFin: datos.fechaFin ?? null,
        descripcion: datos.descripcion ?? null,
      })
      .returning()
    if (!row) throw new Error("crearExperiencia: la inserción no devolvió el registro.")
    return mapExperiencia(row)
  },

  async eliminarExperiencia(id: string, experienciaId: string): Promise<void> {
    const borrados = await db
      .delete(empleadoExperiencia)
      .where(
        and(eq(empleadoExperiencia.id, experienciaId), eq(empleadoExperiencia.funcionarioId, id)),
      )
      .returning({ id: empleadoExperiencia.id })
    if (borrados.length === 0) throw new ErrorNoEncontrado("El registro de experiencia no existe.")
  },

  async guardarSalarial(id: string, datos: GuardarSalarialInput): Promise<DatosSalariales> {
    await assertEmpleadoExiste(id)
    const patch: Partial<typeof empleadoSalarial.$inferInsert> = {}
    if (datos.salarioBasico !== undefined) patch.salarioBasico = numAString(datos.salarioBasico)
    if (datos.auxilioTransporte !== undefined)
      patch.auxilioTransporte = numAString(datos.auxilioTransporte)
    if (datos.promedioDevengado !== undefined)
      patch.promedioDevengado = numAString(datos.promedioDevengado)
    if (datos.valorEnLetras !== undefined) patch.valorEnLetras = datos.valorEnLetras
    if (datos.honorarios !== undefined) patch.honorarios = numAString(datos.honorarios)
    if (datos.eps !== undefined) patch.eps = datos.eps
    if (datos.afp !== undefined) patch.afp = datos.afp

    const [row] = await db
      .insert(empleadoSalarial)
      .values({ funcionarioId: id, ...patch })
      .onConflictDoUpdate({
        target: empleadoSalarial.funcionarioId,
        set: { ...patch, updatedAt: new Date() },
      })
      .returning()
    if (!row) throw new Error("guardarSalarial: el upsert no devolvió la fila.")
    return mapSalarial(row)
  },

  async editarContractual(
    id: string,
    datos: EditarContractualInput,
  ): Promise<EmpleadoContractual> {
    const patch: Partial<typeof funcionarios.$inferInsert> = { updatedAt: new Date() }
    if (datos.areaId !== undefined) patch.areaId = datos.areaId
    if (datos.tipoContrato !== undefined) patch.tipoContrato = datos.tipoContrato
    if (datos.modalidad !== undefined) patch.modalidad = datos.modalidad
    if (datos.programa !== undefined) patch.programa = datos.programa
    if (datos.escalafon !== undefined) patch.escalafon = datos.escalafon
    if (datos.jefeInmediato !== undefined) patch.jefeInmediato = datos.jefeInmediato
    if (datos.fechaPrimerIngreso !== undefined)
      patch.fechaPrimerIngreso = datos.fechaPrimerIngreso
    if (datos.observacion !== undefined) patch.observacion = datos.observacion

    const [row] = await db
      .update(funcionarios)
      .set(patch)
      .where(eq(funcionarios.id, id))
      .returning()
    if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
    return mapContractual(row)
  },

  async guardarFotoPath(id: string, fotoPath: string | null): Promise<EmpleadoContractual> {
    const [row] = await db
      .update(funcionarios)
      .set({ fotoPath, updatedAt: new Date() })
      .where(eq(funcionarios.id, id))
      .returning()
    if (!row) throw new ErrorNoEncontrado("El empleado no existe.")
    return mapContractual(row)
  },

  async obtenerFotoPath(id: string): Promise<string | null> {
    const [row] = await db
      .select({ fotoPath: funcionarios.fotoPath })
      .from(funcionarios)
      .where(eq(funcionarios.id, id))
      .limit(1)
    return row?.fotoPath ?? null
  },
}
