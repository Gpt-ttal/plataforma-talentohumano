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
  | "AREA";

export const ROLES_USUARIO: readonly RolUsuario[] = [
  "SUPERADMIN",
  "TALENTO_HUMANO",
  "CONTROL_INTERNO",
  "AREA",
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
