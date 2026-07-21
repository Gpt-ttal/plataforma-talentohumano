/**
 * cursos.ts — Dominio puro del submódulo Cursos (sin I/O).
 *
 * Un curso es contenido auto-guiado (módulos → lecciones de texto/video) que un
 * funcionario toma SIN login: se identifica por cédula y el backend crea o
 * recupera una `inscripcion` persistente, retomable en cualquier momento. El
 * progreso se marca manualmente lección a lección. Reutiliza el motor de
 * ámbito/estado de `capacitaciones.ts` (mismo `AmbitoCapacitacion`, mismo
 * `EstadoRegistro`) en vez de duplicarlo.
 */

import type { AmbitoCapacitacion, EstadoRegistro } from "./capacitaciones.js";

/** Tipo de contenido de una lección: texto enriquecido (Tiptap) o video externo. */
export type TipoContenidoLeccion = "TEXTO" | "VIDEO";

export const TIPOS_CONTENIDO_LECCION: readonly TipoContenidoLeccion[] = [
  "TEXTO",
  "VIDEO",
] as const;

/** Un curso tal como lo ve el gestor. */
export interface Curso {
  id: string;
  titulo: string;
  descripcion: string | null;
  ambito: AmbitoCapacitacion;
  token: string;
  estadoRegistro: EstadoRegistro;
  creadaPor: string | null;
  createdAt: string;
  updatedAt: string;
  /** Conteo de inscritos — visible en el listado sin entrar al detalle. */
  totalInscritos: number;
}

/** Un módulo (capítulo) que agrupa lecciones dentro de un curso. */
export interface CursoModulo {
  id: string;
  cursoId: string;
  titulo: string;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Una lección dentro de un módulo. `contenidoTexto` almacena HTML sanitizado
 * (salida de Tiptap), no texto plano.
 */
export interface Leccion {
  id: string;
  moduloId: string;
  titulo: string;
  tipoContenido: TipoContenidoLeccion;
  contenidoTexto: string | null;
  urlVideo: string | null;
  orden: number;
  createdAt: string;
  updatedAt: string;
}

/** Un módulo con sus lecciones cargadas, para el editor del gestor. */
export interface CursoModuloConLecciones extends CursoModulo {
  lecciones: Leccion[];
}

/** Detalle de un curso: el curso + su estructura + conteos agregados. */
export interface CursoDetalle {
  curso: Curso;
  modulos: CursoModuloConLecciones[];
  totalLecciones: number;
  totalInscritos: number;
}

/** Filtro del listado de cursos (búsqueda + ámbito + estado + paginación). */
export interface FiltroCursos {
  /** Texto libre: título. */
  q?: string;
  /** Filtro por ámbito (solo el SA elige; TH/SST quedan fijados a su ámbito). */
  ambito?: AmbitoCapacitacion;
  /** Filtro por estado del registro. */
  estado?: EstadoRegistro;
  pagina?: number;
  porPagina?: number;
}

/** Una inscripción persistente: identidad + hitos de actividad, sin login. */
export interface Inscripcion {
  id: string;
  cursoId: string;
  documento: string;
  nombre: string;
  correo: string | null;
  iniciadaEn: string; // ISO datetime
  ultimaActividadEn: string; // ISO datetime
}

/** Un inscrito con su progreso agregado, para el panel en vivo del gestor. */
export interface InscritoConProgreso {
  inscripcionId: string;
  nombre: string;
  documento: string;
  totalLecciones: number;
  completadas: number;
  porcentaje: number;
  iniciadaEn: string;
  ultimaActividadEn: string;
}

/**
 * Proyección PÚBLICA de un curso: la vista previa antes de digitar la cédula.
 * Solo datos no sensibles (sin token, sin inscritos, sin autor, sin progreso).
 */
export interface CursoPublico {
  titulo: string;
  descripcion: string | null;
  ambito: AmbitoCapacitacion;
  estadoRegistro: EstadoRegistro;
  totalModulos: number;
  totalLecciones: number;
}

/** Una lección en la vista pública del funcionario, con su propio progreso. */
export interface LeccionPublica extends Leccion {
  completada: boolean;
}

/** Un módulo en la vista pública del funcionario, con sus lecciones. */
export interface CursoModuloPublico {
  id: string;
  titulo: string;
  orden: number;
  lecciones: LeccionPublica[];
}

/** Progreso agregado de una inscripción sobre el total de lecciones del curso. */
export interface ProgresoResumen {
  totalLecciones: number;
  completadas: number;
  porcentaje: number;
}

/**
 * Forma exacta que devuelven tanto "ingresar al curso" como "completar una
 * lección": la identidad, el curso (proyección mínima), la estructura pública
 * con progreso por lección y el resumen agregado.
 */
export interface IngresoCursoResultado {
  inscripcion: Inscripcion;
  curso: Pick<Curso, "titulo" | "descripcion" | "ambito" | "estadoRegistro">;
  modulos: CursoModuloPublico[];
  progreso: ProgresoResumen;
}

// ── Reglas puras ──────────────────────────────────────────────────────────────

/**
 * ¿Un funcionario puede acceder al contenido de este curso? Distinta de
 * `registroAbierto` (que significa "acepta inscripciones NUEVAS"): un curso
 * CERRADO deja de aceptar gente nueva pero no debe bloquear a quien ya lo
 * estaba tomando. Solo BORRADOR (aún no publicado) bloquea el acceso.
 */
export function cursoAccesible(estado: EstadoRegistro): boolean {
  return estado !== "BORRADOR";
}

/**
 * Calcula el progreso de una inscripción. Un curso sin lecciones se considera
 * 0% (no `NaN`/`Infinity`) para no romper la UI con un curso recién creado.
 */
export function calcularProgreso(
  totalLecciones: number,
  completadas: number,
): ProgresoResumen {
  const porcentaje =
    totalLecciones === 0 ? 0 : Math.round((completadas / totalLecciones) * 100);
  return { totalLecciones, completadas, porcentaje };
}
