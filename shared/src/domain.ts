/**
 * domain.ts — Tipos y contratos del dominio Paz y Salvo.
 * Fuente única de verdad sobre la forma de los datos. Sin lógica.
 */

/** Estado de una dependencia ("área de visto bueno") respecto a un funcionario. */
export type EstadoArea = "PENDIENTE" | "APROBADO" | "NO_APLICA" | "NO_APROBADO";

/** Estado global (consolidado) del paz y salvo de un funcionario. */
export type EstadoGlobal =
  | "PENDIENTE"
  | "LISTO_PARA_LIQUIDAR"
  | "LIQUIDACION_GENERADA"
  | "PAZ_Y_SALVO";

export const ESTADOS_AREA: readonly EstadoArea[] = [
  "PENDIENTE",
  "APROBADO",
  "NO_APLICA",
  "NO_APROBADO",
] as const;

export const ESTADOS_GLOBAL: readonly EstadoGlobal[] = [
  "PENDIENTE",
  "LISTO_PARA_LIQUIDAR",
  "LIQUIDACION_GENERADA",
  "PAZ_Y_SALVO",
] as const;

/**
 * Rol de un usuario autenticado. Define a qué vista aterriza y qué puede tocar:
 *  - SUPERADMIN: lo ve todo y administra usuarios.
 *  - TALENTO_HUMANO / CONTROL_INTERNO: su bandeja del relevo TH → CI.
 *  - AREA: solo la cola de visto bueno de su propia dependencia.
 * La máquina de estados (no la UI) garantiza la validez de cada transición; el rol
 * y las guardas del servidor garantizan QUIÉN puede dispararla.
 */
export type RolUsuario =
  | "SUPERADMIN"
  | "TALENTO_HUMANO"
  | "CONTROL_INTERNO"
  | "AREA"
  | "SST";

export const ROLES_USUARIO: readonly RolUsuario[] = [
  "SUPERADMIN",
  "TALENTO_HUMANO",
  "CONTROL_INTERNO",
  "AREA",
  "SST",
] as const;

/** Ciclo de vida de un usuario: autoregistro → asignación → (des)activación. */
export type EstadoUsuario = "PENDIENTE" | "ACTIVO" | "INACTIVO";

export const ESTADOS_USUARIO: readonly EstadoUsuario[] = [
  "PENDIENTE",
  "ACTIVO",
  "INACTIVO",
] as const;

/** Alias histórico: el "rol" del sistema ahora es el rol de usuario autenticado. */
export type Rol = RolUsuario;
export const ROLES = ROLES_USUARIO;

/**
 * Usuario del sistema. `id` coincide con `auth.users.id` de Supabase. Un usuario
 * de área ACTIVO debe tener `areaId`; el resto de roles no llevan área (invariante
 * validada en `services.ts`).
 */
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  areaId: string | null;
  estado: EstadoUsuario;
  createdAt: string;
  updatedAt: string;
}

/** Una dependencia que debe dar visto bueno (catálogo configurable). */
export interface AreaVistoBueno {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
}

/** Persona en proceso de retiro. */
export interface Funcionario {
  id: string;
  documento: string;
  nombreCompleto: string;
  fechaRetiro: string; // ISO date (yyyy-mm-dd)
  areaOrigen: string; // departamento de origen (del Excel)
  cargo: string;
  estadoGlobal: EstadoGlobal;
  /** Hito de Talento Humano: cuándo se generó la liquidación (avisa a CI). */
  fechaLiquidacionGenerada: string | null; // ISO datetime o null
  /** Autor (rol) de la generación de liquidación. */
  liquidacionGeneradaPor: string | null;
  /** Hito de Control Interno: cierre final → paz y salvo. */
  fechaLiquidacion: string | null; // ISO datetime o null
  /** Autor (rol) del cierre/liquidación final. */
  liquidadoPor: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Estado de una (área × funcionario). */
export interface Aprobacion {
  id: string;
  funcionarioId: string;
  areaId: string;
  estado: EstadoArea;
  updatedAt: string;
}

/** Registro histórico de un cambio/comentario de área. */
export interface Observacion {
  id: string;
  funcionarioId: string;
  areaId: string;
  estado: EstadoArea;
  texto: string;
  autor: string;
  createdAt: string;
}

/** Aprobación enriquecida con el nombre del área (para la UI del detalle). */
export interface AprobacionConArea extends Aprobacion {
  areaNombre: string;
  orden: number;
}

/** Detalle completo de un funcionario para la pantalla de detalle. */
export interface FuncionarioDetalle {
  funcionario: Funcionario;
  aprobaciones: AprobacionConArea[];
  observaciones: Observacion[];
}

/** Fila de la vista de gestión de una sola área (cola de trabajo del área). */
export interface FilaGestionArea {
  funcionario: Funcionario;
  /** Estado de ESTA área para el funcionario. */
  estado: EstadoArea;
}

/** Página solicitada (1-based) para las lecturas paginadas. */
export interface Pagina {
  /** Número de página, comenzando en 1. */
  pagina: number;
  /** Elementos por página. */
  porPagina: number;
}

/** Resultado de una lectura paginada: la página de items + metadatos de navegación. */
export interface ResultadoPaginado<T> {
  items: T[];
  /** Total de elementos que cumplen el filtro (todas las páginas). */
  total: number;
  pagina: number;
  porPagina: number;
  /** Total de páginas (>= 1 incluso si no hay items). */
  totalPaginas: number;
}

/** Filtro del catálogo de funcionarios (búsqueda + estado + paginación). */
export interface FiltroFuncionarios {
  /** Texto libre: nombre o documento. */
  q?: string;
  /** Filtro por estado global consolidado. */
  estado?: EstadoGlobal;
  pagina?: number;
  porPagina?: number;
}

/**
 * Corte de la cola de un área: lo que falta gestionar vs. lo ya gestionado.
 * "gestionados" = APROBADO | NO_APLICA | NO_APROBADO (todo lo que no es PENDIENTE).
 */
export type BucketGestion = "pendientes" | "gestionados" | "todos";

export const BUCKETS_GESTION: readonly BucketGestion[] = [
  "pendientes",
  "gestionados",
  "todos",
] as const;

/** Filtro de la cola de un área: paginación + corte por bucket. */
export interface FiltroGestionArea {
  pagina?: number;
  porPagina?: number;
  bucket?: BucketGestion;
}

/**
 * Cola de un área ya paginada, con los contadores de cada bucket sobre el TOTAL
 * del área (no de la página). Alimenta los chips "Por gestionar (n) / Gestionados (n)".
 */
export interface ColaGestionArea extends ResultadoPaginado<FilaGestionArea> {
  conteos: { pendientes: number; gestionados: number; total: number };
}

/**
 * Una fila de la matriz consolidada: un funcionario y el estado de cada área
 * activa, indexado por `areaId`. Las áreas inactivas no participan (D2).
 */
export interface FilaMatriz {
  funcionario: Funcionario;
  estados: Record<string, EstadoArea>;
}

/**
 * Matriz funcionario × área paginada para los supervisores (SA/TH/CI). Las
 * columnas son las áreas activas en orden; cada fila trae el estado por área.
 */
export interface MatrizGestion extends ResultadoPaginado<FilaMatriz> {
  areas: AreaVistoBueno[];
}

/** Métricas agregadas para el dashboard. */
export interface MetricasDashboard {
  totalFuncionarios: number;
  porEstado: Record<EstadoGlobal, number>;
  pendientesPorArea: { areaId: string; areaNombre: string; pendientes: number }[];
  aging: {
    atrasados: number; // fecha de retiro ya pasó y sigue pendiente
    proximos: number; // retiro en <= 7 días
    masAdelante: number; // retiro a > 7 días
    sinFecha: number;
  };
}

// ── Administración de Personal (maestro de empleados) ────────────────────────
//
// El módulo de personal es la proyección MAESTRA de la misma fila que Paz y Salvo
// lee como `Funcionario`: una tabla, dos vistas. Un empleado nace ACTIVO
// (`fechaRetiro === null`, sin aprobaciones) e invisible para Paz y Salvo; al
// "Finalizar contrato" se le pone `fechaRetiro` y la MISMA fila pasa a ser también
// un `Funcionario` en trámite. Por eso `Funcionario` NO cambia: la nulabilidad de
// `fechaRetiro` vive solo en esta proyección `Empleado`.

/** Tipo de vinculación del empleado (discriminador; deriva de la hoja del Excel). */
export type TipoVinculacion = "ADMINISTRATIVO" | "DOCENTE" | "OPS";

export const TIPOS_VINCULACION: readonly TipoVinculacion[] = [
  "ADMINISTRATIVO",
  "DOCENTE",
  "OPS",
] as const;

/**
 * Ciclo de vida de la vinculación, DERIVADO (sin columna propia) de `fechaRetiro`
 * y `estadoGlobal`: ACTIVO (sin trámite) → EN_RETIRO (trámite en curso) → RETIRADO
 * (trámite cerrado). La función pura vive en `personal.ts`.
 */
export type EstadoVinculacion = "ACTIVO" | "EN_RETIRO" | "RETIRADO";

export const ESTADOS_VINCULACION: readonly EstadoVinculacion[] = [
  "ACTIVO",
  "EN_RETIRO",
  "RETIRADO",
] as const;

/** Tipo de novedad laboral ("Otro sí" ligero: solo cargo y extensión en v1). */
export type NovedadTipo = "CAMBIO_CARGO" | "EXTENSION_CONTRATO";

export const NOVEDAD_TIPOS: readonly NovedadTipo[] = [
  "CAMBIO_CARGO",
  "EXTENSION_CONTRATO",
] as const;

/**
 * Empleado — proyección maestra de la fila de `funcionarios`. Superconjunto de los
 * campos de `Funcionario` con los datos de núcleo del expediente. `fechaRetiro` es
 * nullable (null = ACTIVO). El 360° (familia, formación, salarial, escalafón) se
 * añade en fase 2.
 */
export interface Empleado {
  id: string;
  documento: string;
  nombreCompleto: string;
  tipoVinculacion: TipoVinculacion | null; // null = legacy sin clasificar
  cargo: string;
  /** Área/dependencia actual (texto libre; en UI "área actual"). */
  areaOrigen: string;
  fechaIngreso: string | null; // ISO date (contratación)
  fechaFinContrato: string | null; // ISO date (fin de contrato vigente)
  correoInstitucional: string | null;
  telefono: string | null;
  /** null = ACTIVO. Se puebla en "Finalizar contrato" (dispara el trámite). */
  fechaRetiro: string | null; // ISO date
  /** Relevante solo cuando hay trámite; para un ACTIVO no significa nada. */
  estadoGlobal: EstadoGlobal;
  createdAt: string;
  updatedAt: string;
}

/** Novedad laboral (append-only): un cambio contractual con su motivo y autor. */
export interface Novedad {
  id: string;
  funcionarioId: string;
  tipo: NovedadTipo;
  motivo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  autor: string;
  createdAt: string;
}

/** Detalle de un empleado para la ficha: el maestro + su historial de novedades. */
export interface EmpleadoDetalle {
  empleado: Empleado;
  novedades: Novedad[];
}

/** Filtro del catálogo de empleados (búsqueda + tipo + estado de vinculación). */
export interface FiltroEmpleados {
  /** Texto libre: nombre o documento. */
  q?: string;
  tipoVinculacion?: TipoVinculacion;
  vinculoEstado?: EstadoVinculacion;
  pagina?: number;
  porPagina?: number;
}

// ── Hoja de vida 360° (Administración de Personal v2) ────────────────────────
//
// El expediente completo se reparte en bloques satélite por afinidad y
// sensibilidad. `funcionarios` gana campos CONTRACTUALES; el resto vive en tablas
// 1-1 (personales, salarial) y 1-N (familiares, formación, experiencia). El bloque
// salarial está protegido por RLS: solo SUPERADMIN/TALENTO_HUMANO lo reciben.

/** Ejes contractuales desambiguados (≠ `tipoVinculacion`, que es la naturaleza). */
export type TipoContrato =
  | "TERMINO_FIJO"
  | "TERMINO_INDEFINIDO"
  | "OBRA_LABOR"
  | "PRESTACION_SERVICIOS";

export const TIPOS_CONTRATO: readonly TipoContrato[] = [
  "TERMINO_FIJO",
  "TERMINO_INDEFINIDO",
  "OBRA_LABOR",
  "PRESTACION_SERVICIOS",
] as const;

export type Modalidad = "PRESENCIAL" | "HIBRIDO" | "VIRTUAL";

export const MODALIDADES: readonly Modalidad[] = [
  "PRESENCIAL",
  "HIBRIDO",
  "VIRTUAL",
] as const;

export type Genero = "MASCULINO" | "FEMENINO" | "OTRO";

export const GENEROS: readonly Genero[] = ["MASCULINO", "FEMENINO", "OTRO"] as const;

export type Parentesco = "CONYUGE" | "HIJO" | "PADRE" | "MADRE" | "OTRO";

export const PARENTESCOS: readonly Parentesco[] = [
  "CONYUGE",
  "HIJO",
  "PADRE",
  "MADRE",
  "OTRO",
] as const;

export type NivelFormacion =
  | "BACHILLER"
  | "TECNICO"
  | "TECNOLOGO"
  | "PROFESIONAL"
  | "ESPECIALIZACION"
  | "MAESTRIA"
  | "DOCTORADO"
  | "POSTDOCTORADO";

export const NIVELES_FORMACION: readonly NivelFormacion[] = [
  "BACHILLER",
  "TECNICO",
  "TECNOLOGO",
  "PROFESIONAL",
  "ESPECIALIZACION",
  "MAESTRIA",
  "DOCTORADO",
  "POSTDOCTORADO",
] as const;

/** Bloque contractual extendido en `funcionarios` (no sensible). */
export interface EmpleadoContractual {
  areaId: string | null;
  tipoContrato: TipoContrato | null;
  modalidad: Modalidad | null;
  programa: string | null;
  escalafon: string | null;
  jefeInmediato: string | null;
  fechaPrimerIngreso: string | null; // ISO date
  observacion: string | null;
  fotoPath: string | null;
}

/** Bloque personal (1-1). */
export interface DatosPersonales {
  fechaExpedicion: string | null;
  lugarExpedicion: string | null;
  fechaNacimiento: string | null;
  lugarNacimiento: string | null;
  genero: Genero | null;
  direccion: string | null;
  barrio: string | null;
  municipio: string | null;
  correoPersonal: string | null;
}

/** Familiar a cargo (1-N). */
export interface Familiar {
  id: string;
  funcionarioId: string;
  parentesco: Parentesco;
  nombre: string;
  fechaNacimiento: string | null;
  genero: Genero | null;
  createdAt: string;
}

/** Registro de formación académica (1-N). */
export interface Formacion {
  id: string;
  funcionarioId: string;
  nivel: NivelFormacion;
  titulo: string;
  institucion: string | null;
  anioInicio: number | null;
  anioFin: number | null;
  createdAt: string;
}

/** Experiencia laboral previa (1-N). */
export interface Experiencia {
  id: string;
  funcionarioId: string;
  empresa: string;
  cargo: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  descripcion: string | null;
  createdAt: string;
}

/**
 * Bloque salarial/prestacional (1-1, SENSIBLE). Todo nullable porque OPS usa
 * `honorarios` sin salario/EPS/AFP, y admin/docente al revés. Solo se entrega a
 * SUPERADMIN/TALENTO_HUMANO (RLS + guarda de aplicación).
 */
export interface DatosSalariales {
  salarioBasico: number | null;
  auxilioTransporte: number | null;
  promedioDevengado: number | null;
  valorEnLetras: string | null;
  honorarios: number | null;
  eps: string | null;
  afp: string | null;
}

/**
 * Expediente completo (hoja de vida 360°): el empleado + todos sus bloques. El
 * bloque `salarial` es `undefined` cuando el rol del actor NO puede verlo (a
 * diferencia de `null`, que significa "visible pero sin datos"). `salarialVisible`
 * distingue ambos casos para la UI ("restringido" vs "vacío").
 */
export interface ExpedienteCompleto {
  empleado: Empleado;
  contractual: EmpleadoContractual;
  personales: DatosPersonales | null;
  familiares: Familiar[];
  formacion: Formacion[];
  experiencia: Experiencia[];
  novedades: Novedad[];
  /** true si el actor puede ver el bloque salarial (aunque esté vacío). */
  salarialVisible: boolean;
  /** Presente solo si `salarialVisible`; null = visible pero sin datos aún. */
  salarial?: DatosSalariales | null;
}
