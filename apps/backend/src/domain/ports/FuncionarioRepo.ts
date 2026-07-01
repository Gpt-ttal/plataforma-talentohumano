import type {
  ColaGestionArea,
  EstadoArea,
  FilaGestionArea,
  FiltroArchivo,
  FiltroFuncionarios,
  FiltroGestionArea,
  Funcionario,
  FuncionarioDetalle,
  MatrizGestion,
  MetricasDashboard,
  ResultadoPaginado,
} from "@pys/shared"

export interface CambiarEstadoAreaArgs {
  funcionarioId: string
  areaId: string
  estado: EstadoArea
  /** Obligatoria para PENDIENTE y NO_APROBADO (se valida en la acción). */
  observacion?: string
  autor?: string
}

export interface ResultadoMutacion {
  estadoGlobal: Funcionario["estadoGlobal"]
  hayRechazo: boolean
}

export interface FuncionarioRepo {
  listarFuncionarios(): Promise<Funcionario[]>
  listarGestionArea(areaId: string): Promise<FilaGestionArea[]>
  obtenerDetalle(funcionarioId: string): Promise<FuncionarioDetalle | null>
  cambiarEstadoArea(args: CambiarEstadoAreaArgs): Promise<ResultadoMutacion>
  /** Hito de Talento Humano: marca la liquidación como generada (avisa a CI). */
  generarLiquidacion(
    funcionarioId: string,
    autor?: string,
  ): Promise<ResultadoMutacion>
  /** Hito de Control Interno: cierre final → paz y salvo. */
  registrarLiquidacion(
    funcionarioId: string,
    autor?: string,
  ): Promise<ResultadoMutacion>
  obtenerMetricas(): Promise<MetricasDashboard>
  /** Catálogo de funcionarios con búsqueda + filtro de estado + paginación. */
  listarFuncionariosPaginado(
    filtro?: FiltroFuncionarios,
  ): Promise<ResultadoPaginado<Funcionario>>
  /**
   * Matriz funcionario × área activa (visibilidad consolidada para supervisores):
   * la página de funcionarios + el estado de cada área activa + las columnas.
   */
  listarMatrizPaginado(filtro?: FiltroFuncionarios): Promise<MatrizGestion>
  /** Cola de trabajo de un área, paginada y partida por bucket + contadores. */
  listarGestionAreaPaginado(
    areaId: string,
    filtro?: FiltroGestionArea,
  ): Promise<ColaGestionArea>
  /**
   * Archivo institucional: funcionarios en estado terminal `PAZ_Y_SALVO`, con
   * búsqueda + rango de fecha de retiro + paginación. Solo lectura.
   */
  listarArchivo(filtro?: FiltroArchivo): Promise<ResultadoPaginado<Funcionario>>
}
