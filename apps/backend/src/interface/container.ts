import { env } from "../config/env.js"
import { areaRepository } from "../infrastructure/db/areaRepository.js"
import { usuarioRepository } from "../infrastructure/db/usuarioRepository.js"
import { funcionarioRepository } from "../infrastructure/db/funcionarioRepository.js"
import { capacitacionRepository } from "../infrastructure/db/capacitacionRepository.js"
import { verificarJwt } from "../infrastructure/auth/supabaseJwtVerifier.js"
import { supabaseStorage } from "../infrastructure/storage/supabaseStorage.js"
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
  crearEmpleado,
  crearExperiencia,
  crearFamiliar,
  crearFormacion,
  crearUrlSubidaFoto,
  editarCapacitacion,
  editarContractual,
  editarEmpleado,
  eliminarExperiencia,
  eliminarFamiliar,
  eliminarFormacion,
  exportarArchivo,
  exportarAsistencias,
  finalizarContrato,
  generarLiquidacion,
  guardarFoto,
  guardarPersonales,
  guardarSalarial,
  listarAreas,
  listarArchivo,
  listarCapacitaciones,
  listarEmpleados,
  listarFuncionarios,
  listarGestionArea,
  listarUsuarios,
  moverArea,
  obtenerDetalle,
  obtenerCapacitacionPublica,
  obtenerDetalleCapacitacion,
  obtenerEmpleado,
  obtenerExpediente,
  obtenerExpedientePersonal,
  obtenerMatriz,
  obtenerMetricas,
  obtenerUrlFoto,
  registrarAsistenciaPublica,
  registrarLiquidacion,
  registrarNovedad,
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
  crearEmpleado: crearEmpleado({ repo: funcionarioRepository }),
  editarEmpleado: editarEmpleado({ repo: funcionarioRepository }),
  finalizarContrato: finalizarContrato({ repo: funcionarioRepository }),
  registrarNovedad: registrarNovedad({ repo: funcionarioRepository }),
  listarEmpleados: listarEmpleados({ repo: funcionarioRepository }),
  obtenerEmpleado: obtenerEmpleado({ repo: funcionarioRepository }),
  obtenerExpedientePersonal: obtenerExpedientePersonal({ repo: funcionarioRepository }),
  guardarPersonales: guardarPersonales({ repo: funcionarioRepository }),
  crearFamiliar: crearFamiliar({ repo: funcionarioRepository }),
  eliminarFamiliar: eliminarFamiliar({ repo: funcionarioRepository }),
  crearFormacion: crearFormacion({ repo: funcionarioRepository }),
  eliminarFormacion: eliminarFormacion({ repo: funcionarioRepository }),
  crearExperiencia: crearExperiencia({ repo: funcionarioRepository }),
  eliminarExperiencia: eliminarExperiencia({ repo: funcionarioRepository }),
  guardarSalarial: guardarSalarial({ repo: funcionarioRepository }),
  editarContractual: editarContractual({ repo: funcionarioRepository }),
  crearUrlSubidaFoto: crearUrlSubidaFoto({ storage: supabaseStorage }),
  guardarFoto: guardarFoto({ repo: funcionarioRepository }),
  obtenerUrlFoto: obtenerUrlFoto({ repo: funcionarioRepository, storage: supabaseStorage }),
}

export type Casos = typeof casos

export const requireAuth = crearRequireAuth({ verificar: verificarJwt, asegurar })
