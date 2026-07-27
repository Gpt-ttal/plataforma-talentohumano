/**
 * aplicarRegistroSync.ts — Puente fila-de-lote → expediente (UPSERT por documento).
 *
 * Función standalone `Ejecutor`-parametrizada (mismo patrón que
 * `iniciarTramiteDesvinculacion(args, ex)` / `recomputarEstado(id, ex)`): se
 * invoca DENTRO de una transacción ya abierta por `reconcileRepo`. Toda la lógica
 * de escritura del sync vive AQUÍ, en un solo lugar, para que el camino de lote y
 * un futuro camino directo (motor de reglas, §8 del diseño) no la dupliquen.
 *
 * Reparte la fila normalizada a `funcionarios` + satélites por UPSERT por
 * `documento`: si el documento no existe → alta de empleado nuevo (maestro, NO
 * inicia trámite: `fecha_retiro` queda NULL); si existe → actualiza solo los campos
 * que Iceberg trae (no vacíos). Cada sobrescritura de un valor divergente ya
 * presente se registra en `eventos_auditoria` (autoridad "último sync gana" con
 * trazabilidad; §3 del diseño).
 *
 * PENDIENTES v1 (documentados, no cerrados):
 *  - `certificadoBancario` → `empleado_bancario`: estructura del payload aún no
 *    definida; NO se reparte (se conserva en el staging). Se cierra con el payload real.
 *  - `personasACargo`: es un CONTEO, no crea `empleado_familiares` (no hay datos por
 *    familiar). Informativo en v1.
 *  - `estadoContrato`: informativo; el estado real se DERIVA (`EstadoVinculacion`).
 *  - Fondo/sede sin match en el catálogo → `fondo_sede_id` NULL + evento de auditoría
 *    (decisión best-effort del plan). NO se auto-crea la sede.
 *  - Iceberg `correo` → `empleado_personales.correo_personal` (el institucional es
 *    identidad, no se pisa). `fondoPensionCesantias` → `empleado_salarial.fondo_cesantias`
 *    (cadena combinada; `afp`/pensión queda para captura manual).
 */

import { eq, sql } from "drizzle-orm"
import { db } from "../client.js"
import {
  empleadoPersonales,
  empleadoSalarial,
  filasSyncPersonal,
  fondosSede,
  funcionarios,
} from "../schema.js"
import type { Ejecutor } from "../recomputarEstado.js"
import { registrarEvento } from "../eventoAuditoriaRepository.js"

type FilaSyncRow = typeof filasSyncPersonal.$inferSelect

export interface ResultadoAplicarSync {
  funcionarioId: string
  creado: boolean
}

/** Un valor entrante "no vacío" (Iceberg lo trae). Los `null` no tocan el expediente. */
function trae<T>(v: T | null): v is T {
  return v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")
}

/** Compara para auditoría: los montos por valor numérico, el resto como texto. */
function divergente(antes: unknown, despues: unknown, numerico = false): boolean {
  if (antes === null || antes === undefined) return false // no había valor previo → no es "sobrescritura"
  if (numerico) return Number(antes) !== Number(despues)
  return String(antes) !== String(despues)
}

/** Resuelve un nombre de fondo/sede al id del catálogo (trim + case-insensitive). `null` si no existe. */
async function resolverFondoSedeId(nombre: string, ex: Ejecutor): Promise<string | null> {
  const [row] = await ex
    .select({ id: fondosSede.id })
    .from(fondosSede)
    .where(sql`lower(trim(${fondosSede.nombre})) = lower(trim(${nombre}))`)
    .limit(1)
  return row?.id ?? null
}

export async function aplicarRegistroSync(
  fila: FilaSyncRow,
  autor: string,
  ex: Ejecutor = db,
): Promise<ResultadoAplicarSync> {
  // Estado actual del expediente (por documento). null en cada bloque ausente.
  const [actual] = await ex
    .select()
    .from(funcionarios)
    .where(eq(funcionarios.documento, fila.documento))
    .limit(1)
  const creado = !actual

  // Un empleado retirado/en trámite/archivado (`fecha_retiro` seteada) tiene su
  // maestro CONGELADO para el circuito de Paz y Salvo: un sync rezagado NO debe
  // mutar sus datos descriptivos. Se omite y se audita.
  if (actual && actual.fechaRetiro !== null) {
    await registrarEvento(
      {
        entidadTipo: "funcionario",
        entidadId: actual.id,
        accion: "SYNC_OMITIDO_RETIRADO",
        actorNombre: autor?.trim() || "Sync de Personal",
        estadoNuevo: { documento: fila.documento },
        metadata: { loteFilaId: fila.id, origen: "SYNC" },
      },
      ex,
    )
    return { funcionarioId: actual.id, creado: false }
  }

  // Fondo/sede: nombre → FK. Sin match → null (best-effort) + se audita abajo.
  let fondoSedeId: string | null = null
  let fondoSedeSinMatch = false
  if (trae(fila.fondoSede)) {
    fondoSedeId = await resolverFondoSedeId(fila.fondoSede, ex)
    fondoSedeSinMatch = fondoSedeId === null
  }

  // Cambios divergentes (valor ya presente que se pisa) → auditoría.
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {}
  const anotar = (campo: string, antes: unknown, despues: unknown, numerico = false) => {
    if (divergente(antes, despues, numerico)) cambios[campo] = { antes, despues }
  }

  // ── funcionarios (núcleo + contractual no sensible) ──
  const patchFunc: Partial<typeof funcionarios.$inferInsert> = { updatedAt: new Date() }
  patchFunc.nombreCompleto = fila.nombreCompleto
  anotar("nombreCompleto", actual?.nombreCompleto, fila.nombreCompleto)
  if (trae(fila.cargo)) {
    // `cargo` lo administra Personal por novedad auditada: el sync lo usa como
    // fuente inicial en el ALTA pero NO lo pisa en un empleado existente (se
    // excluye del patch de update abajo). Por eso no se audita como sobrescritura.
    patchFunc.cargo = fila.cargo
  }
  if (trae(fila.dependencia)) {
    patchFunc.areaOrigen = fila.dependencia
    anotar("dependencia", actual?.areaOrigen, fila.dependencia)
  }
  if (trae(fila.telefono)) {
    patchFunc.telefono = fila.telefono
    anotar("telefono", actual?.telefono, fila.telefono)
  }
  if (trae(fila.tipoContrato)) {
    patchFunc.tipoContrato = fila.tipoContrato
    anotar("tipoContrato", actual?.tipoContrato, fila.tipoContrato)
  }
  if (trae(fila.tipoEmpleado)) {
    patchFunc.tipoVinculacion = fila.tipoEmpleado
    anotar("tipoEmpleado", actual?.tipoVinculacion, fila.tipoEmpleado)
  }
  if (trae(fila.fechaIngreso)) {
    patchFunc.fechaIngreso = fila.fechaIngreso
    anotar("fechaIngreso", actual?.fechaIngreso, fila.fechaIngreso)
  }
  if (trae(fila.fechaFinContrato)) {
    // Igual que `cargo`: fuente inicial en el ALTA, no se pisa en update
    // (Personal la administra por novedad auditada).
    patchFunc.fechaFinContrato = fila.fechaFinContrato
  }
  if (trae(fila.tipoDocumento)) {
    patchFunc.tipoDocumento = fila.tipoDocumento
    anotar("tipoDocumento", actual?.tipoDocumento, fila.tipoDocumento)
  }
  if (trae(fila.nacionalidad)) {
    patchFunc.nacionalidad = fila.nacionalidad
    anotar("nacionalidad", actual?.nacionalidad, fila.nacionalidad)
  }
  if (trae(fila.centroCostos)) {
    patchFunc.centroCostos = fila.centroCostos
    anotar("centroCostos", actual?.centroCostos, fila.centroCostos)
  }
  if (trae(fila.categoria)) {
    patchFunc.categoria = fila.categoria
    anotar("categoria", actual?.categoria, fila.categoria)
  }
  if (fondoSedeId !== null) {
    patchFunc.fondoSedeId = fondoSedeId
    anotar("fondoSedeId", actual?.fondoSedeId, fondoSedeId)
  }

  let funcionarioId: string
  if (actual) {
    funcionarioId = actual.id
    // Personal administra `cargo` y `fechaFinContrato` vía novedad auditada; el
    // sync NO los pisa en un empleado ya existente (sí los toma en el alta).
    const patchUpdate = { ...patchFunc }
    delete patchUpdate.cargo
    delete patchUpdate.fechaFinContrato
    await ex.update(funcionarios).set(patchUpdate).where(eq(funcionarios.id, actual.id))
  } else {
    // Alta nueva (maestro): NO inicia trámite (fecha_retiro NULL). `cargo`/`areaOrigen`
    // son NOT NULL en el esquema; si Iceberg no los trae, placeholder vacío.
    const [ins] = await ex
      .insert(funcionarios)
      .values({
        documento: fila.documento,
        nombreCompleto: fila.nombreCompleto,
        cargo: trae(fila.cargo) ? fila.cargo : "",
        areaOrigen: trae(fila.dependencia) ? fila.dependencia : "",
        telefono: patchFunc.telefono,
        tipoContrato: patchFunc.tipoContrato,
        tipoVinculacion: patchFunc.tipoVinculacion,
        fechaIngreso: patchFunc.fechaIngreso,
        fechaFinContrato: patchFunc.fechaFinContrato,
        tipoDocumento: patchFunc.tipoDocumento,
        nacionalidad: patchFunc.nacionalidad,
        centroCostos: patchFunc.centroCostos,
        categoria: patchFunc.categoria,
        fondoSedeId,
      })
      .returning({ id: funcionarios.id })
    if (!ins) throw new Error("aplicarRegistroSync: el alta de empleado no devolvió id.")
    funcionarioId = ins.id
  }

  // ── empleado_personales ──
  const [persActual] = actual
    ? await ex
        .select()
        .from(empleadoPersonales)
        .where(eq(empleadoPersonales.funcionarioId, funcionarioId))
        .limit(1)
    : []
  const patchPers: Partial<typeof empleadoPersonales.$inferInsert> = {}
  const setPers = (
    col: keyof typeof empleadoPersonales.$inferInsert,
    campo: string,
    valor: string | null,
    antes: unknown,
  ) => {
    if (trae(valor)) {
      ;(patchPers as Record<string, unknown>)[col] = valor
      anotar(campo, antes, valor)
    }
  }
  setPers("genero", "genero", fila.genero, persActual?.genero)
  setPers("fechaExpedicion", "fechaExpedicion", fila.fechaExpedicion, persActual?.fechaExpedicion)
  setPers("fechaNacimiento", "fechaNacimiento", fila.fechaNacimiento, persActual?.fechaNacimiento)
  setPers("direccion", "direccion", fila.direccion, persActual?.direccion)
  setPers("barrio", "barrio", fila.barrio, persActual?.barrio)
  setPers("correoPersonal", "correo", fila.correo, persActual?.correoPersonal)
  setPers("estadoCivil", "estadoCivil", fila.estadoCivil, persActual?.estadoCivil)
  setPers("lugarResidencia", "lugarResidencia", fila.lugarResidencia, persActual?.lugarResidencia)
  if (Object.keys(patchPers).length > 0) {
    await ex
      .insert(empleadoPersonales)
      .values({ funcionarioId, ...patchPers })
      .onConflictDoUpdate({
        target: empleadoPersonales.funcionarioId,
        set: { ...patchPers, updatedAt: new Date() },
      })
  }

  // ── empleado_salarial (sensible) ──
  const [salActual] = actual
    ? await ex
        .select()
        .from(empleadoSalarial)
        .where(eq(empleadoSalarial.funcionarioId, funcionarioId))
        .limit(1)
    : []
  const patchSal: Partial<typeof empleadoSalarial.$inferInsert> = {}
  if (trae(fila.salario)) {
    patchSal.salarioBasico = fila.salario
    anotar("salario", salActual?.salarioBasico, fila.salario, true)
  }
  if (trae(fila.eps)) {
    patchSal.eps = fila.eps
    anotar("eps", salActual?.eps, fila.eps)
  }
  if (trae(fila.fondoPensionCesantias)) {
    patchSal.fondoCesantias = fila.fondoPensionCesantias
    // Clave de auditoría = campo canónico del diff (`CAMPOS_DIFF` en diffSync.ts),
    // no el nombre de la columna destino: así la vista previa y el evento coinciden.
    anotar("fondoPensionCesantias", salActual?.fondoCesantias, fila.fondoPensionCesantias)
  }
  if (Object.keys(patchSal).length > 0) {
    await ex
      .insert(empleadoSalarial)
      .values({ funcionarioId, ...patchSal })
      .onConflictDoUpdate({
        target: empleadoSalarial.funcionarioId,
        set: { ...patchSal, updatedAt: new Date() },
      })
  }

  // ── Auditoría: alta, sobrescrituras divergentes y fondo/sede sin match ──
  const hayCambios = Object.keys(cambios).length > 0
  if (creado || hayCambios || fondoSedeSinMatch) {
    await registrarEvento(
      {
        entidadTipo: "funcionario",
        entidadId: funcionarioId,
        accion: creado ? "SYNC_ALTA_EMPLEADO" : "SYNC_ACTUALIZAR_EMPLEADO",
        actorNombre: autor?.trim() || "Sync de Personal",
        estadoNuevo: hayCambios ? cambios : { documento: fila.documento },
        observacion: fondoSedeSinMatch
          ? `Fondo/sede sin coincidencia en el catálogo: "${fila.fondoSede}" (no asignado).`
          : null,
        metadata: { loteFilaId: fila.id, origen: "SYNC" },
      },
      ex,
    )
  }

  return { funcionarioId, creado }
}
