import type {
  Curso,
  CursoDetalle,
  CursoModulo,
  CursoPublico,
  FiltroCursos,
  IngresoCursoResultado,
  InscritoConProgreso,
  Leccion,
  ResultadoPaginado,
} from "@pys/shared"

/**
 * Puerto de gestión autenticada de Cursos (Fase 2) + flujo público ("tomar el
 * curso por cédula": `obtenerPorToken`/`ingresarInscripcion`/
 * `marcarLeccionCompletada`, Fase 3).
 */
export interface CursoRepo {
  listarCursos(filtro: FiltroCursos): Promise<ResultadoPaginado<Curso>>

  crearCurso(
    input: Omit<
      Curso,
      "id" | "token" | "estadoRegistro" | "createdAt" | "updatedAt" | "totalInscritos"
    >,
  ): Promise<Curso>

  obtenerDetalle(id: string): Promise<CursoDetalle | null>

  editarCurso(
    id: string,
    input: Partial<Pick<Curso, "titulo" | "descripcion" | "ambito">>,
  ): Promise<Curso>

  /**
   * UPDATE condicionado a `estadoEsperado` + RETURNING: la comprobación y la
   * escritura son la misma operación atómica (mismo molde que
   * `generarLiquidacion`/`registrarLiquidacion`). Si 0 filas, el caso de uso
   * distingue "no existe" de "ya cambió de estado" con un SELECT adicional.
   */
  cambiarEstadoRegistro(
    id: string,
    estado: Curso["estadoRegistro"],
    estadoEsperado: Curso["estadoRegistro"],
  ): Promise<Curso>

  crearModulo(cursoId: string, titulo: string): Promise<CursoModulo>
  // Las mutaciones de módulo/lección reciben el `cursoId` para acotar la
  // operación al curso padre en el propio `WHERE` (defensa en profundidad contra
  // IDOR/BOLA cross-ámbito: la capa de aplicación ya coteja pertenencia en
  // memoria, esto lo garantiza también a nivel atómico ante cualquier caller).
  editarModulo(cursoId: string, moduloId: string, titulo: string): Promise<CursoModulo>
  moverModulo(
    cursoId: string,
    moduloId: string,
    direccion: "subir" | "bajar",
  ): Promise<CursoModulo[]>
  eliminarModulo(cursoId: string, moduloId: string): Promise<void>

  crearLeccion(
    cursoId: string,
    moduloId: string,
    input: Pick<Leccion, "titulo" | "tipoContenido" | "contenidoTexto" | "urlVideo">,
  ): Promise<Leccion>
  editarLeccion(
    cursoId: string,
    leccionId: string,
    input: Partial<Pick<Leccion, "titulo" | "tipoContenido" | "contenidoTexto" | "urlVideo">>,
  ): Promise<Leccion>
  moverLeccion(
    moduloId: string,
    leccionId: string,
    direccion: "subir" | "bajar",
  ): Promise<Leccion[]>
  eliminarLeccion(cursoId: string, leccionId: string): Promise<void>

  /** Progreso agregado por inscrito, para el panel en vivo del gestor. */
  listarInscritos(cursoId: string): Promise<InscritoConProgreso[]>

  /** Proyección pública del curso para la pantalla previa a digitar la cédula. */
  obtenerPorToken(token: string): Promise<CursoPublico | null>

  /**
   * Ingresa (o recupera) la inscripción de un documento a un curso. Idempotente:
   * (curso_id, documento) tiene UNIQUE → gana el primer nombre escrito, sin duplicar.
   */
  ingresarInscripcion(
    token: string,
    datos: { nombre: string; documento: string },
  ): Promise<IngresoCursoResultado>

  /**
   * Marca una lección como completada para una inscripción existente. Idempotente:
   * (inscripcion_id, leccion_id) tiene UNIQUE → doble clic no duplica ni falla.
   */
  marcarLeccionCompletada(
    token: string,
    documento: string,
    leccionId: string,
  ): Promise<IngresoCursoResultado>
}
