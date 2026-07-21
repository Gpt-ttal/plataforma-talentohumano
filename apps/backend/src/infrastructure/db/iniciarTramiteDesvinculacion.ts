import { and, eq, isNull } from "drizzle-orm"
import type { ResultadoMutacion } from "../../domain/ports/FuncionarioRepo.js"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { aprobaciones, areas, funcionarios } from "./schema.js"
import { recomputarEstado, type Ejecutor } from "./recomputarEstado.js"
import { registrarEvento } from "./eventoAuditoriaRepository.js"

export interface IniciarTramiteDesvinculacionArgs {
  id: string
  fechaRetiro: string
  autor: string
}

/**
 * Puente Empleado → trámite de desvinculación: fija `fechaRetiro`, hace
 * backfill de aprobaciones PENDIENTE para las áreas activas, registra el
 * evento de auditoría y recalcula el estado global (la máquina de estados no
 * se toca). Guarda TOCTOU: solo dispara si el empleado está ACTIVO
 * (`fechaRetiro` NULL).
 *
 * Función standalone (no un método de repo), mismo patrón que
 * `recomputarEstado(id, ex)`/`registrarEvento(evento, ex)` — se invoca DENTRO
 * de una transacción ya abierta. La usan tanto `finalizarContrato` (caso
 * individual) como la confirmación de un lote de importación masiva (varias
 * filas, misma tx), sin duplicar la lógica del puente entre ambos caminos.
 */
export async function iniciarTramiteDesvinculacion(
  args: IniciarTramiteDesvinculacionArgs,
  ex: Ejecutor = db,
): Promise<ResultadoMutacion> {
  const { id, fechaRetiro, autor } = args

  const flip = await ex
    .update(funcionarios)
    .set({ fechaRetiro, updatedAt: new Date() })
    .where(and(eq(funcionarios.id, id), isNull(funcionarios.fechaRetiro)))
    .returning({ id: funcionarios.id })
  if (flip.length === 0) {
    const existe = await ex
      .select({ id: funcionarios.id })
      .from(funcionarios)
      .where(eq(funcionarios.id, id))
      .limit(1)
    if (existe.length === 0) throw new ErrorNoEncontrado("El empleado no existe.")
    throw new ErrorValidacion(
      "El contrato ya fue finalizado; el trámite ya está en curso.",
    )
  }

  // Backfill de aprobaciones PENDIENTE para las áreas ACTIVAS (mismo mecanismo
  // que `crearArea`). `onConflictDoNothing` es defensivo.
  const areasActivas = await ex
    .select({ id: areas.id })
    .from(areas)
    .where(eq(areas.activa, true))
  if (areasActivas.length > 0) {
    await ex
      .insert(aprobaciones)
      .values(
        areasActivas.map((a) => ({
          funcionarioId: id,
          areaId: a.id,
          estado: "PENDIENTE" as const,
        })),
      )
      .onConflictDoNothing()
  }

  await registrarEvento(
    {
      entidadTipo: "funcionario",
      entidadId: id,
      accion: "INICIAR_TRAMITE_DESVINCULACION",
      actorNombre: autor?.trim() || "Talento Humano",
      estadoNuevo: { fechaRetiro },
    },
    ex,
  )

  // Recalcular el estado global (PENDIENTE, o LISTO_PARA_LIQUIDAR si no hay
  // áreas activas). Reusa la máquina de estados sin tocarla.
  return recomputarEstado(id, ex)
}
