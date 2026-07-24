import { eq } from "drizzle-orm"
import type { Vacante } from "@pys/shared"
import { tipoVinculacionDesdeDedicacion } from "@pys/shared"
import { ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { funcionarios } from "./schema.js"
import { type Ejecutor } from "./recomputarEstado.js"
import { registrarEvento } from "./eventoAuditoriaRepository.js"

export interface ResultadoPuenteVacante {
  funcionarioId: string
}

/**
 * Puente Vacante → Funcionario (ADR-0009): al marcar una vacante como
 * CONTRATADO se crea el empleado ACTIVO correspondiente en la MISMA transacción
 * que el INSERT/UPDATE de la vacante. Función standalone (no un método de repo),
 * mismo patrón que `iniciarTramiteDesvinculacion(args, ex)` — se invoca DENTRO
 * de una transacción ya abierta, nunca como paso separado.
 *
 * Precondiciones garantizadas por `evaluarFila` antes de llegar aquí (BLOQUEOs
 * de CONTRATADO): `cedula`, `nombreNuevo`, `fechaContratacion` y `areaId` no
 * vacíos — por eso el repo puede resolver un `areaNombre: string` no nulo.
 *
 * Cédula ya existente como funcionario → `ErrorValidacion` con rollback completo
 * (la vacante NO cambia de estado): mismo pre-chequeo + catch `23505` que
 * `empleadoRepo.crearEmpleado`. Se descarta auto-enlazar a un funcionario
 * existente porque ocultaría typos de cédula y reingresos que Talento Humano
 * debe resolver a mano.
 */
export async function crearFuncionarioDesdeVacante(
  vacante: Vacante,
  areaNombre: string,
  autor: string,
  ex: Ejecutor = db,
): Promise<ResultadoPuenteVacante> {
  const documento = vacante.cedula
  if (!documento || !vacante.nombreNuevo || !vacante.fechaContratacion) {
    // Nunca debería ocurrir (evaluarFila lo bloquea); guardián explícito por si
    // el puente se invoca fuera del flujo validado.
    throw new ErrorValidacion(
      "No se puede crear el empleado: la vacante no tiene cédula, nombre o fecha de contratación.",
    )
  }

  // Pre-chequeo amistoso; el UNIQUE(documento) es el guardián real ante una carrera.
  const yaExiste = await ex
    .select({ id: funcionarios.id })
    .from(funcionarios)
    .where(eq(funcionarios.documento, documento))
    .limit(1)
  if (yaExiste.length > 0) {
    throw new ErrorValidacion(
      `Ya existe un empleado con la cédula ${documento}; revisa la cédula o gestiona el reingreso a mano.`,
    )
  }

  let funcionarioId: string
  try {
    const [row] = await ex
      .insert(funcionarios)
      .values({
        documento,
        nombreCompleto: vacante.nombreNuevo,
        cargo: vacante.cargo,
        areaOrigen: areaNombre,
        tipoVinculacion: tipoVinculacionDesdeDedicacion(vacante.dedicacion),
        fechaIngreso: vacante.fechaContratacion,
        jefeInmediato: vacante.jefe,
        // Empleado ACTIVO: sin fecha de retiro ni aprobaciones. Invisible para
        // Paz y Salvo hasta que se finalice el contrato (ADR-0003).
        fechaRetiro: null,
      })
      .returning({ id: funcionarios.id })
    if (!row) {
      throw new Error("crearFuncionarioDesdeVacante: la inserción no devolvió el empleado.")
    }
    funcionarioId = row.id
  } catch (e) {
    // Carrera ganada por otra transacción entre el pre-chequeo y el insert.
    if ((e as { code?: string })?.code === "23505") {
      throw new ErrorValidacion(
        `Ya existe un empleado con la cédula ${documento}; revisa la cédula o gestiona el reingreso a mano.`,
      )
    }
    throw e
  }

  await registrarEvento(
    {
      entidadTipo: "funcionario",
      entidadId: funcionarioId,
      accion: "ALTA_EMPLEADO_DESDE_VACANTE",
      actorNombre: autor?.trim() || "Vacantes",
      estadoNuevo: {
        documento,
        cargo: vacante.cargo,
        areaOrigen: areaNombre,
        vacanteId: vacante.id,
      },
      metadata: { origen: "VACANTE", vacanteId: vacante.id },
    },
    ex,
  )

  return { funcionarioId }
}
