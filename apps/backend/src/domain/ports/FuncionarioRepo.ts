import type {
  ColaGestionArea,
  CrearEmpleadoInput,
  CrearExperienciaInput,
  CrearFamiliarInput,
  CrearFormacionInput,
  DatosPersonales,
  DatosSalariales,
  EditarContractualInput,
  EditarEmpleadoInput,
  Empleado,
  EmpleadoContractual,
  EmpleadoDetalle,
  EstadoArea,
  Experiencia,
  ExpedienteCompleto,
  Familiar,
  FilaGestionArea,
  FiltroArchivo,
  FiltroEmpleados,
  FiltroFuncionarios,
  FiltroGestionArea,
  Formacion,
  Funcionario,
  FuncionarioDetalle,
  GuardarPersonalesInput,
  GuardarSalarialInput,
  MatrizGestion,
  MetricasDashboard,
  RegistrarNovedadInput,
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
  hayDevolucion: boolean
}

export interface DevolverCasoAAreaArgs {
  funcionarioId: string
  areaId: string
  /** Siempre obligatoria (se valida en el caso de uso). */
  observacion: string
  autor?: string
}

export interface ArchivarCasoResultado {
  archivadoEn: string
}

export interface FuncionarioRepo {
  listarGestionArea(areaId: string): Promise<FilaGestionArea[]>
  obtenerDetalle(funcionarioId: string): Promise<FuncionarioDetalle | null>
  cambiarEstadoArea(args: CambiarEstadoAreaArgs): Promise<ResultadoMutacion>
  /**
   * Control Interno devuelve el caso a un área puntual (`DEVUELTO_POR_CI`) para
   * que lo revise de nuevo, dejando observación y evento de auditoría.
   */
  devolverCasoAArea(args: DevolverCasoAAreaArgs): Promise<ResultadoMutacion>
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
  /**
   * Sella el archivado formal de un trámite ya cerrado (`PAZ_Y_SALVO`).
   * UPDATE condicionado (idempotencia/TOCTOU): 0 filas si ya estaba archivado
   * o si el estado cambió entre la lectura y la escritura.
   */
  archivarCaso(funcionarioId: string, autor?: string): Promise<ArchivarCasoResultado>
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

  // ── Maestro de empleados (Administración de Personal) ──────────────────────
  // La misma fila de `funcionarios` proyectada como `Empleado`. Un empleado nace
  // ACTIVO (`fechaRetiro === null`, sin aprobaciones) e invisible para Paz y Salvo.

  /** Alta manual de un empleado ACTIVO (sin trámite, sin aprobaciones). */
  crearEmpleado(datos: CrearEmpleadoInput): Promise<Empleado>
  /** Edición del núcleo del expediente (no toca `fechaRetiro` ni el trámite). */
  editarEmpleado(id: string, datos: EditarEmpleadoInput): Promise<Empleado>
  /**
   * Puente a Paz y Salvo: fija `fechaRetiro`, hace backfill de aprobaciones
   * PENDIENTE para las áreas activas y recalcula el estado global. La máquina de
   * estados no se toca. Guarda TOCTOU: solo dispara si el empleado está ACTIVO.
   */
  finalizarContrato(
    id: string,
    fechaRetiro: string,
    autor: string,
  ): Promise<ResultadoMutacion>
  /** "Otro sí" ligero: registra la novedad y aplica el cambio al empleado. */
  registrarNovedad(
    id: string,
    novedad: RegistrarNovedadInput,
    autor: string,
  ): Promise<EmpleadoDetalle>
  /** Catálogo del maestro: todos los empleados (ACTIVO + trámite), paginado. */
  listarEmpleadosPaginado(
    filtro?: FiltroEmpleados,
  ): Promise<ResultadoPaginado<Empleado>>
  /** Ficha del empleado: el maestro + su historial de novedades (DESC). */
  obtenerEmpleado(id: string): Promise<EmpleadoDetalle | null>
  /**
   * Expediente 360°: el empleado + todos sus bloques satélite (personales,
   * familiares, formación, experiencia, novedades) + contractual. Los bloques
   * sensibles se incluyen solo si su flag lo permite: `incluyeSalarial` →
   * `salarialVisible = true`; `incluyeBancario` → `bancarioVisible = true`.
   * `null` si el empleado no existe.
   */
  obtenerExpediente(
    id: string,
    incluyeSalarial: boolean,
    incluyeBancario: boolean,
  ): Promise<ExpedienteCompleto | null>

  // ── Hoja de vida 360°: captura por bloque satélite (Sprint 2) ───────────────
  // Upsert (1-1: personales/salarial/contractual) o alta+baja (1-N: familia/
  // formación/experiencia). Ownership de las bajas: la fila debe pertenecer al
  // empleado indicado, si no `ErrorNoEncontrado`.

  /** Upsert del bloque personal (1-1). Solo toca las claves presentes. */
  guardarPersonales(id: string, datos: GuardarPersonalesInput): Promise<DatosPersonales>
  /** Alta de un familiar (1-N). */
  crearFamiliar(id: string, datos: CrearFamiliarInput): Promise<Familiar>
  /** Baja de un familiar propio del empleado. */
  eliminarFamiliar(id: string, familiarId: string): Promise<void>
  /** Alta de un registro de formación académica (1-N). */
  crearFormacion(id: string, datos: CrearFormacionInput): Promise<Formacion>
  /** Baja de un registro de formación propio del empleado. */
  eliminarFormacion(id: string, formacionId: string): Promise<void>
  /** Alta de un registro de experiencia laboral previa (1-N). */
  crearExperiencia(id: string, datos: CrearExperienciaInput): Promise<Experiencia>
  /** Baja de un registro de experiencia propio del empleado. */
  eliminarExperiencia(id: string, experienciaId: string): Promise<void>
  /** Upsert del bloque salarial (1-1, SENSIBLE). Solo toca las claves presentes. */
  guardarSalarial(id: string, datos: GuardarSalarialInput): Promise<DatosSalariales>
  /** Patch del bloque contractual extendido (columnas de `funcionarios`). */
  editarContractual(id: string, datos: EditarContractualInput): Promise<EmpleadoContractual>
  /** Persiste la ruta del objeto de Storage tras una subida exitosa (o `null` para borrarla). */
  guardarFotoPath(id: string, fotoPath: string | null): Promise<EmpleadoContractual>
  /** Solo la ruta de la foto (para pedir su URL firmada de lectura). `null` si no tiene. */
  obtenerFotoPath(id: string): Promise<string | null>
}
