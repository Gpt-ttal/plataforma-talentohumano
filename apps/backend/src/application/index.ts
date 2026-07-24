/**
 * Barrel de la capa de aplicación: casos de uso (con sus guardas de rol/área y de
 * transición de estado) + errores tipados + verja de rol. El composition root de
 * la capa HTTP (Fase 4) inyecta los repos aquí.
 */

export * from "./errors.js"
export { exigirRol } from "./guards.js"

// Funcionarios
export { archivarCaso } from "./funcionarios/archivarCaso.js"
export { cambiarEstadoArea } from "./funcionarios/cambiarEstadoArea.js"
export { devolverCasoAArea } from "./funcionarios/devolverCasoAArea.js"
export { generarLiquidacion } from "./funcionarios/generarLiquidacion.js"
export { registrarLiquidacion } from "./funcionarios/registrarLiquidacion.js"
export { listarFuncionarios } from "./funcionarios/listarFuncionarios.js"
export { obtenerMatriz } from "./funcionarios/obtenerMatriz.js"
export { obtenerDetalle } from "./funcionarios/obtenerDetalle.js"
export { obtenerMetricas } from "./funcionarios/obtenerMetricas.js"

// Archivo institucional
export { listarArchivo } from "./archivo/listarArchivo.js"
export { obtenerExpediente } from "./archivo/obtenerExpediente.js"
export { exportarArchivo } from "./archivo/exportarArchivo.js"

// Mi área
export { listarGestionArea } from "./miarea/listarGestionArea.js"

// Usuarios
export { asignarRol } from "./usuarios/asignarRol.js"
export { cambiarEstadoUsuario } from "./usuarios/cambiarEstadoUsuario.js"
export { listarUsuarios } from "./usuarios/listarUsuarios.js"

// Áreas
export { listarAreas } from "./areas/listarAreas.js"
export { crearArea } from "./areas/crearArea.js"
export { renombrarArea } from "./areas/renombrarArea.js"
export { moverArea } from "./areas/moverArea.js"
export { cambiarActivaArea } from "./areas/cambiarActivaArea.js"

// Auth
export { asegurarUsuario } from "./auth/asegurarUsuario.js"
export type { ResultadoAlta } from "./auth/asegurarUsuario.js"

// Administración de Personal
export { crearEmpleado } from "./personal/crearEmpleado.js"
export { editarEmpleado } from "./personal/editarEmpleado.js"
export { finalizarContrato } from "./personal/finalizarContrato.js"
export { registrarNovedad } from "./personal/registrarNovedad.js"
export { listarEmpleados } from "./personal/listarEmpleados.js"
export { obtenerEmpleado } from "./personal/obtenerEmpleado.js"
export { obtenerExpedientePersonal, veSalarial } from "./personal/obtenerExpedientePersonal.js"

// Hoja de vida 360° — captura por bloque satélite (Sprint 2)
export { guardarPersonales } from "./personal/guardarPersonales.js"
export { crearFamiliar } from "./personal/crearFamiliar.js"
export { eliminarFamiliar } from "./personal/eliminarFamiliar.js"
export { crearFormacion } from "./personal/crearFormacion.js"
export { eliminarFormacion } from "./personal/eliminarFormacion.js"
export { crearExperiencia } from "./personal/crearExperiencia.js"
export { eliminarExperiencia } from "./personal/eliminarExperiencia.js"
export { guardarSalarial } from "./personal/guardarSalarial.js"
export { editarContractual } from "./personal/editarContractual.js"
export { crearUrlSubidaFoto } from "./personal/crearUrlSubidaFoto.js"
export { guardarFoto } from "./personal/guardarFoto.js"
export { obtenerUrlFoto } from "./personal/obtenerUrlFoto.js"

// Capacitaciones
export { crearCapacitacion } from "./capacitaciones/crearCapacitacion.js"
export { listarCapacitaciones } from "./capacitaciones/listarCapacitaciones.js"
export { obtenerDetalleCapacitacion } from "./capacitaciones/obtenerDetalleCapacitacion.js"
export { obtenerCapacitacionPublica } from "./capacitaciones/obtenerCapacitacionPublica.js"
export { editarCapacitacion } from "./capacitaciones/editarCapacitacion.js"
export { abrirRegistro } from "./capacitaciones/abrirRegistro.js"
export { cerrarRegistro } from "./capacitaciones/cerrarRegistro.js"
export { exportarAsistencias } from "./capacitaciones/exportarAsistencias.js"
export { registrarAsistenciaPublica } from "./capacitaciones/registrarAsistenciaPublica.js"

// Cursos (gestión autenticada + flujo público "tomar el curso por cédula")
export { crearCurso } from "./cursos/crearCurso.js"
export { listarCursos } from "./cursos/listarCursos.js"
export { obtenerDetalleCurso } from "./cursos/obtenerDetalleCurso.js"
export { editarCurso } from "./cursos/editarCurso.js"
export { abrirRegistroCurso } from "./cursos/abrirRegistroCurso.js"
export { cerrarRegistroCurso } from "./cursos/cerrarRegistroCurso.js"
export { crearModuloCurso } from "./cursos/crearModuloCurso.js"
export { editarModuloCurso } from "./cursos/editarModuloCurso.js"
export { moverModuloCurso } from "./cursos/moverModuloCurso.js"
export { eliminarModuloCurso } from "./cursos/eliminarModuloCurso.js"
export { crearLeccionCurso } from "./cursos/crearLeccionCurso.js"
export { editarLeccionCurso } from "./cursos/editarLeccionCurso.js"
export { moverLeccionCurso } from "./cursos/moverLeccionCurso.js"
export { eliminarLeccionCurso } from "./cursos/eliminarLeccionCurso.js"
export { listarInscritosCurso } from "./cursos/listarInscritosCurso.js"
export { obtenerCursoPublico } from "./cursos/obtenerCursoPublico.js"
export { ingresarCurso } from "./cursos/ingresarCurso.js"
export { marcarLeccionCompletadaCurso } from "./cursos/marcarLeccionCompletadaCurso.js"

// Planificador (agenda anual de capacitaciones planeadas, CRUD simple)
export { crearCapacitacionPlaneada } from "./planificador/crearCapacitacionPlaneada.js"
export { listarCapacitacionesPlaneadas } from "./planificador/listarCapacitacionesPlaneadas.js"
export { editarCapacitacionPlaneada } from "./planificador/editarCapacitacionPlaneada.js"
export { eliminarCapacitacionPlaneada } from "./planificador/eliminarCapacitacionPlaneada.js"

// Importación masiva de desvinculaciones
export { previsualizarImportacionDesvinculaciones } from "./desvinculaciones/previsualizarImportacionDesvinculaciones.js"
export { confirmarImportacionParcial } from "./desvinculaciones/confirmarImportacionParcial.js"

// Sync de personal (Iceberg): ingesta (servicio/manual) → revisión → confirmación
export { ingestarLoteSync } from "./sync-personal/ingestarLoteSync.js"
export { obtenerLoteSync } from "./sync-personal/obtenerLoteSync.js"
export { confirmarSyncParcial } from "./sync-personal/confirmarSyncParcial.js"
export { veBancario } from "./personal/obtenerExpedientePersonal.js"

// Vacantes
export { listarVacantes } from "./vacantes/listarVacantes.js"
export { obtenerVacante } from "./vacantes/obtenerVacante.js"
export { crearVacante } from "./vacantes/crearVacante.js"
export { actualizarVacante } from "./vacantes/actualizarVacante.js"
export { obtenerDashboardVacantes } from "./vacantes/obtenerDashboardVacantes.js"
export { obtenerCatalogosVacantes } from "./vacantes/obtenerCatalogosVacantes.js"
export { obtenerSugerenciasVacante } from "./vacantes/obtenerSugerenciasVacante.js"
