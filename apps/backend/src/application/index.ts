/**
 * Barrel de la capa de aplicación: casos de uso (con sus guardas de rol/área y de
 * transición de estado) + errores tipados + verja de rol. El composition root de
 * la capa HTTP (Fase 4) inyecta los repos aquí.
 */

export * from "./errors.js"
export { exigirRol } from "./guards.js"

// Funcionarios
export { cambiarEstadoArea } from "./funcionarios/cambiarEstadoArea.js"
export { generarLiquidacion } from "./funcionarios/generarLiquidacion.js"
export { registrarLiquidacion } from "./funcionarios/registrarLiquidacion.js"
export { listarFuncionarios } from "./funcionarios/listarFuncionarios.js"
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

// Auth
export { asegurarUsuario } from "./auth/asegurarUsuario.js"
export type { ResultadoAlta } from "./auth/asegurarUsuario.js"
