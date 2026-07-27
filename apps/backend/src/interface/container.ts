import { env } from "../config/env.js"
import { areaRepository } from "../infrastructure/db/areaRepository.js"
import { usuarioRepository } from "../infrastructure/db/usuarioRepository.js"
import { preaprobacionRepository } from "../infrastructure/db/preaprobacionRepository.js"
import { permisoRepository } from "../infrastructure/db/permisoRepository.js"
import { funcionarioRepository } from "../infrastructure/db/funcionarioRepository.js"
import { capacitacionRepository } from "../infrastructure/db/capacitacionRepository.js"
import { cursoRepository } from "../infrastructure/db/cursoRepository.js"
import { planificadorRepository } from "../infrastructure/db/planificadorRepository.js"
import { loteImportacionRepository } from "../infrastructure/db/loteImportacionRepository.js"
import { vacanteRepository } from "../infrastructure/db/vacanteRepository.js"
import { verificarJwt } from "../infrastructure/auth/supabaseJwtVerifier.js"
import { supabaseStorage } from "../infrastructure/storage/supabaseStorage.js"
import {
  abrirRegistro,
  abrirRegistroCurso,
  actualizarPermisosRol,
  actualizarVacante,
  cargarMatriz,
  archivarCaso,
  asegurarUsuario,
  asignarRol,
  cambiarActivaArea,
  cambiarEstadoArea,
  cambiarEstadoUsuario,
  cerrarRegistro,
  cerrarRegistroCurso,
  confirmarImportacionParcial,
  crearArea,
  crearCapacitacion,
  crearCapacitacionPlaneada,
  crearCurso,
  crearEmpleado,
  crearExperiencia,
  crearFamiliar,
  crearFormacion,
  crearLeccionCurso,
  crearModuloCurso,
  crearUrlSubidaFoto,
  crearPreaprobado,
  crearVacante,
  devolverCasoAArea,
  eliminarPreaprobado,
  editarCapacitacion,
  editarCapacitacionPlaneada,
  editarContractual,
  editarCurso,
  editarEmpleado,
  editarLeccionCurso,
  editarModuloCurso,
  eliminarCapacitacionPlaneada,
  eliminarExperiencia,
  eliminarFamiliar,
  eliminarFormacion,
  eliminarLeccionCurso,
  eliminarModuloCurso,
  exportarArchivo,
  exportarAsistencias,
  finalizarContrato,
  generarLiquidacion,
  guardarFoto,
  guardarPersonales,
  guardarSalarial,
  ingresarCurso,
  listarAreas,
  listarArchivo,
  listarCapacitaciones,
  listarCapacitacionesPlaneadas,
  listarCursos,
  listarEmpleados,
  listarFuncionarios,
  listarGestionArea,
  listarInscritosCurso,
  listarMatrizPermisos,
  listarPreaprobados,
  listarUsuarios,
  modulosVisibles,
  listarVacantes,
  marcarLeccionCompletadaCurso,
  moverArea,
  moverLeccionCurso,
  moverModuloCurso,
  obtenerDetalle,
  obtenerCapacitacionPublica,
  obtenerCatalogosVacantes,
  obtenerCursoPublico,
  obtenerDashboardVacantes,
  obtenerDetalleCapacitacion,
  obtenerDetalleCurso,
  obtenerEmpleado,
  obtenerExpediente,
  obtenerExpedientePersonal,
  obtenerMatriz,
  obtenerMetricas,
  obtenerSugerenciasVacante,
  obtenerUrlFoto,
  obtenerVacante,
  previsualizarImportacionDesvinculaciones,
  registrarAsistenciaPublica,
  registrarLiquidacion,
  registrarNovedad,
  renombrarArea,
} from "../application/index.js"
import { crearRequireAuth } from "./middleware/requireAuth.js"
import { crearRequirePermiso } from "./middleware/requirePermiso.js"

/**
 * Composition root: inyecta los repos Drizzle en los casos de uso y arma el
 * `requireAuth` con el verificador JWT + autoregistro. Es el único lugar que
 * conoce las implementaciones concretas; controllers y routes solo ven las
 * funciones ya cableadas.
 */
const asegurar = asegurarUsuario({
  repo: usuarioRepository,
  preRepo: preaprobacionRepository,
  superadminEmail: env.SUPERADMIN_EMAIL,
  dominioPermitido: env.DOMINIO_PERMITIDO,
})

// Loader de la matriz de permisos (lectura fresca por request, con fallback a la
// semilla de MODULOS mientras la 0023 no esté aplicada).
const cargador = cargarMatriz({ repo: permisoRepository })

export const casos = {
  listarFuncionarios: listarFuncionarios({ repo: funcionarioRepository }),
  obtenerMatriz: obtenerMatriz({ repo: funcionarioRepository }),
  obtenerDetalle: obtenerDetalle({ repo: funcionarioRepository }),
  cambiarEstadoArea: cambiarEstadoArea({ repo: funcionarioRepository }),
  devolverCasoAArea: devolverCasoAArea({ repo: funcionarioRepository }),
  archivarCaso: archivarCaso({ repo: funcionarioRepository }),
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
  listarPreaprobados: listarPreaprobados({ repo: preaprobacionRepository }),
  crearPreaprobado: crearPreaprobado({ repo: preaprobacionRepository }),
  eliminarPreaprobado: eliminarPreaprobado({ repo: preaprobacionRepository }),
  listarMatrizPermisos: listarMatrizPermisos({ cargador }),
  actualizarPermisosRol: actualizarPermisosRol({ repo: permisoRepository }),
  modulosVisibles: modulosVisibles({ cargador }),
  listarCapacitaciones: listarCapacitaciones({ repo: capacitacionRepository }),
  crearCapacitacion: crearCapacitacion({ repo: capacitacionRepository }),
  obtenerDetalleCapacitacion: obtenerDetalleCapacitacion({ repo: capacitacionRepository }),
  obtenerInfoPublica: obtenerCapacitacionPublica({ repo: capacitacionRepository }),
  editarCapacitacion: editarCapacitacion({ repo: capacitacionRepository }),
  abrirRegistro: abrirRegistro({ repo: capacitacionRepository }),
  cerrarRegistro: cerrarRegistro({ repo: capacitacionRepository }),
  exportarAsistencias: exportarAsistencias({ repo: capacitacionRepository }),
  registrarAsistenciaPublica: registrarAsistenciaPublica({ repo: capacitacionRepository }),
  listarCursos: listarCursos({ repo: cursoRepository }),
  crearCurso: crearCurso({ repo: cursoRepository }),
  obtenerDetalleCurso: obtenerDetalleCurso({ repo: cursoRepository }),
  editarCurso: editarCurso({ repo: cursoRepository }),
  abrirRegistroCurso: abrirRegistroCurso({ repo: cursoRepository }),
  cerrarRegistroCurso: cerrarRegistroCurso({ repo: cursoRepository }),
  crearModuloCurso: crearModuloCurso({ repo: cursoRepository }),
  editarModuloCurso: editarModuloCurso({ repo: cursoRepository }),
  moverModuloCurso: moverModuloCurso({ repo: cursoRepository }),
  eliminarModuloCurso: eliminarModuloCurso({ repo: cursoRepository }),
  crearLeccionCurso: crearLeccionCurso({ repo: cursoRepository }),
  editarLeccionCurso: editarLeccionCurso({ repo: cursoRepository }),
  moverLeccionCurso: moverLeccionCurso({ repo: cursoRepository }),
  eliminarLeccionCurso: eliminarLeccionCurso({ repo: cursoRepository }),
  listarInscritosCurso: listarInscritosCurso({ repo: cursoRepository }),
  obtenerCursoPublico: obtenerCursoPublico({ repo: cursoRepository }),
  ingresarCurso: ingresarCurso({ repo: cursoRepository }),
  marcarLeccionCompletadaCurso: marcarLeccionCompletadaCurso({ repo: cursoRepository }),
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
  listarCapacitacionesPlaneadas: listarCapacitacionesPlaneadas({ repo: planificadorRepository }),
  crearCapacitacionPlaneada: crearCapacitacionPlaneada({ repo: planificadorRepository }),
  editarCapacitacionPlaneada: editarCapacitacionPlaneada({ repo: planificadorRepository }),
  eliminarCapacitacionPlaneada: eliminarCapacitacionPlaneada({ repo: planificadorRepository }),
  previsualizarImportacionDesvinculaciones: previsualizarImportacionDesvinculaciones({
    repo: loteImportacionRepository,
  }),
  confirmarImportacionParcial: confirmarImportacionParcial({ repo: loteImportacionRepository }),
  listarVacantes: listarVacantes({ repo: vacanteRepository }),
  obtenerVacante: obtenerVacante({ repo: vacanteRepository }),
  crearVacante: crearVacante({ repo: vacanteRepository }),
  actualizarVacante: actualizarVacante({ repo: vacanteRepository }),
  obtenerDashboardVacantes: obtenerDashboardVacantes({ repo: vacanteRepository }),
  obtenerCatalogosVacantes: obtenerCatalogosVacantes({ repo: vacanteRepository }),
  obtenerSugerenciasVacante: obtenerSugerenciasVacante({ repo: vacanteRepository }),
}

export type Casos = typeof casos

export const requireAuth = crearRequireAuth({ verificar: verificarJwt, asegurar })

/**
 * `requirePermiso(moduloId, nivel)` — se monta DESPUÉS de `requireRol` en cada
 * router de módulo. Suma a la guarda de rol: la matriz solo puede restar acceso.
 */
export const requirePermiso = crearRequirePermiso({ nivelDe: cargador.nivelDe })
