import type { MetricasDashboard, Usuario } from "@pys/shared"
import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { exigirRol } from "../guards.js"

/**
 * Métricas del dashboard. Las ve la plataforma (SUPERADMIN y TALENTO_HUMANO):
 * ambos operan el catálogo y el Panel de control consolidado de toda la
 * institución. Control Interno y Área entran directo a su trabajo, no al panel.
 */
export function obtenerMetricas(deps: { repo: FuncionarioRepo }) {
  return async (usuario: Usuario): Promise<MetricasDashboard> => {
    exigirRol(
      usuario,
      ["SUPERADMIN", "TALENTO_HUMANO"],
      "Solo la plataforma (superadministrador y talento humano) ve el panel.",
    )
    return deps.repo.obtenerMetricas()
  }
}
