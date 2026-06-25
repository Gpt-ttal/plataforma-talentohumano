import { env } from "../config/env.js"
import { areaRepository } from "../infrastructure/db/areaRepository.js"
import { usuarioRepository } from "../infrastructure/db/usuarioRepository.js"
import { funcionarioRepository } from "../infrastructure/db/funcionarioRepository.js"
import { verificarJwt } from "../infrastructure/auth/supabaseJwtVerifier.js"
import {
  asegurarUsuario,
  asignarRol,
  cambiarEstadoArea,
  cambiarEstadoUsuario,
  exportarArchivo,
  generarLiquidacion,
  listarAreas,
  listarArchivo,
  listarFuncionarios,
  listarGestionArea,
  listarUsuarios,
  obtenerDetalle,
  obtenerExpediente,
  obtenerMetricas,
  registrarLiquidacion,
} from "../application/index.js"
import { crearRequireAuth } from "./middleware/requireAuth.js"

/**
 * Composition root: inyecta los repos Drizzle en los casos de uso y arma el
 * `requireAuth` con el verificador JWT + autoregistro. Es el único lugar que
 * conoce las implementaciones concretas; controllers y routes solo ven las
 * funciones ya cableadas.
 */
const asegurar = asegurarUsuario({
  repo: usuarioRepository,
  superadminEmail: env.SUPERADMIN_EMAIL,
  dominioPermitido: env.DOMINIO_PERMITIDO,
})

export const casos = {
  listarFuncionarios: listarFuncionarios({ repo: funcionarioRepository }),
  obtenerDetalle: obtenerDetalle({ repo: funcionarioRepository }),
  cambiarEstadoArea: cambiarEstadoArea({ repo: funcionarioRepository }),
  generarLiquidacion: generarLiquidacion({ repo: funcionarioRepository }),
  registrarLiquidacion: registrarLiquidacion({ repo: funcionarioRepository }),
  listarGestionArea: listarGestionArea({ repo: funcionarioRepository }),
  obtenerMetricas: obtenerMetricas({ repo: funcionarioRepository }),
  listarArchivo: listarArchivo({ repo: funcionarioRepository }),
  obtenerExpediente: obtenerExpediente({ repo: funcionarioRepository }),
  exportarArchivo: exportarArchivo({ repo: funcionarioRepository }),
  listarAreas: listarAreas({ repo: areaRepository }),
  asignarRol: asignarRol({ repo: usuarioRepository }),
  cambiarEstadoUsuario: cambiarEstadoUsuario({ repo: usuarioRepository }),
  listarUsuarios: listarUsuarios({ repo: usuarioRepository }),
}

export type Casos = typeof casos

export const requireAuth = crearRequireAuth({ verificar: verificarJwt, asegurar })
