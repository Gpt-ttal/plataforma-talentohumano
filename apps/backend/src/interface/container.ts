import { env } from "../config/env.js"
import { areaRepository } from "../infrastructure/db/areaRepository.js"
import { usuarioRepository } from "../infrastructure/db/usuarioRepository.js"
import { funcionarioRepository } from "../infrastructure/db/funcionarioRepository.js"
import { capacitacionRepository } from "../infrastructure/db/capacitacionRepository.js"
import { verificarJwt } from "../infrastructure/auth/supabaseJwtVerifier.js"
import {
  abrirRegistro,
  asegurarUsuario,
  asignarRol,
  cambiarActivaArea,
  cambiarEstadoArea,
  cambiarEstadoUsuario,
  cerrarRegistro,
  crearArea,
  crearCapacitacion,
  editarCapacitacion,
  exportarArchivo,
  exportarAsistencias,
  generarLiquidacion,
  listarAreas,
  listarArchivo,
  listarCapacitaciones,
  listarFuncionarios,
  listarGestionArea,
  listarUsuarios,
  moverArea,
  obtenerDetalle,
  obtenerCapacitacionPublica,
  obtenerDetalleCapacitacion,
  obtenerExpediente,
  obtenerMatriz,
  obtenerMetricas,
  registrarAsistenciaPublica,
  registrarLiquidacion,
  renombrarArea,
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
  obtenerMatriz: obtenerMatriz({ repo: funcionarioRepository }),
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
  crearArea: crearArea({ repo: areaRepository }),
  renombrarArea: renombrarArea({ repo: areaRepository }),
  moverArea: moverArea({ repo: areaRepository }),
  cambiarActivaArea: cambiarActivaArea({ repo: areaRepository }),
  asignarRol: asignarRol({ repo: usuarioRepository }),
  cambiarEstadoUsuario: cambiarEstadoUsuario({ repo: usuarioRepository }),
  listarUsuarios: listarUsuarios({ repo: usuarioRepository }),
  listarCapacitaciones: listarCapacitaciones({ repo: capacitacionRepository }),
  crearCapacitacion: crearCapacitacion({ repo: capacitacionRepository }),
  obtenerDetalleCapacitacion: obtenerDetalleCapacitacion({ repo: capacitacionRepository }),
  obtenerInfoPublica: obtenerCapacitacionPublica({ repo: capacitacionRepository }),
  editarCapacitacion: editarCapacitacion({ repo: capacitacionRepository }),
  abrirRegistro: abrirRegistro({ repo: capacitacionRepository }),
  cerrarRegistro: cerrarRegistro({ repo: capacitacionRepository }),
  exportarAsistencias: exportarAsistencias({ repo: capacitacionRepository }),
  registrarAsistenciaPublica: registrarAsistenciaPublica({ repo: capacitacionRepository }),
}

export type Casos = typeof casos

export const requireAuth = crearRequireAuth({ verificar: verificarJwt, asegurar })
