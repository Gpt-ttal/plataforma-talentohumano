import type { FuncionarioRepo } from "../../domain/ports/FuncionarioRepo.js"
import { tramiteRepo, mapFuncionario } from "./funcionario/tramiteRepo.js"
import { empleadoRepo } from "./funcionario/empleadoRepo.js"
import { expedienteRepo } from "./funcionario/expedienteRepo.js"

export const funcionarioRepository: FuncionarioRepo = {
  ...tramiteRepo,
  ...empleadoRepo,
  ...expedienteRepo,
}

export { mapFuncionario }
