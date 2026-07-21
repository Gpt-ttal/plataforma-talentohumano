import type { Curso, FiltroCursos, Usuario } from "@pys/shared"
import { ambitosVisibles } from "@pys/shared"
import type { ResultadoPaginado } from "@pys/shared"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"
import { exigirRol } from "../guards.js"

const ROLES_LECTORES = ["SUPERADMIN", "TALENTO_HUMANO", "SST"] as const

export function listarCursos(deps: { repo: CursoRepo }) {
  return async (actor: Usuario, filtro: FiltroCursos): Promise<ResultadoPaginado<Curso>> => {
    exigirRol(actor, [...ROLES_LECTORES], "Solo gestores de cursos pueden listar cursos.")

    // Si el rol no es SA, filtrar por su ámbito propio (ignora el ámbito del query).
    const visibles = ambitosVisibles(actor.rol)
    const ambito =
      visibles.length === 1
        ? visibles[0] // TH → TH; SST → SST (fijado)
        : filtro.ambito // SA puede filtrar libremente

    return deps.repo.listarCursos({ ...filtro, ambito })
  }
}
