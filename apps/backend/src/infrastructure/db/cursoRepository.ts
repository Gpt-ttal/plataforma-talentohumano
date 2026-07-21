import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm"
import { randomBytes } from "node:crypto"
import type {
  Curso,
  CursoDetalle,
  CursoModulo,
  CursoModuloConLecciones,
  CursoModuloPublico,
  CursoPublico,
  FiltroCursos,
  IngresoCursoResultado,
  InscritoConProgreso,
  Inscripcion,
  Leccion,
  ResultadoPaginado,
} from "@pys/shared"
import { calcularProgreso, cursoAccesible } from "@pys/shared"
import { ErrorNoEncontrado, ErrorValidacion } from "../../application/errors.js"
import { db } from "./client.js"
import { cursoLecciones, cursoModulos, cursos, inscripciones, progresoLecciones } from "./schema.js"
import type { CursoRepo } from "../../domain/ports/CursoRepo.js"

/**
 * Ejecutor de consultas: el `db` normal o una transacción (`tx`). Mismo patrón
 * que `recomputarEstado.ts`, definido local para no acoplar el módulo de Cursos
 * al de Áreas/Personal.
 */
type Ejecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapCurso(r: typeof cursos.$inferSelect, totalInscritos = 0): Curso {
  return {
    id: r.id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    ambito: r.ambito,
    token: r.token,
    estadoRegistro: r.estadoRegistro,
    creadaPor: r.creadaPor,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    totalInscritos,
  }
}

function mapCursoModulo(r: typeof cursoModulos.$inferSelect): CursoModulo {
  return {
    id: r.id,
    cursoId: r.cursoId,
    titulo: r.titulo,
    orden: r.orden,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

function mapLeccion(r: typeof cursoLecciones.$inferSelect): Leccion {
  return {
    id: r.id,
    moduloId: r.moduloId,
    titulo: r.titulo,
    tipoContenido: r.tipoContenido,
    contenidoTexto: r.contenidoTexto,
    urlVideo: r.urlVideo,
    orden: r.orden,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

function mapInscripcion(r: typeof inscripciones.$inferSelect): Inscripcion {
  return {
    id: r.id,
    cursoId: r.cursoId,
    documento: r.documento,
    nombre: r.nombre,
    correo: r.correo,
    iniciadaEn: r.iniciadaEn.toISOString(),
    ultimaActividadEn: r.ultimaActividadEn.toISOString(),
  }
}

// ── Helpers internos (scoping por padre) ─────────────────────────────────────

async function listarModulosDeCurso(cursoId: string, ex: Ejecutor = db): Promise<CursoModulo[]> {
  const rows = await ex
    .select()
    .from(cursoModulos)
    .where(eq(cursoModulos.cursoId, cursoId))
    .orderBy(asc(cursoModulos.orden))
  return rows.map(mapCursoModulo)
}

async function listarLeccionesDeModulo(moduloId: string, ex: Ejecutor = db): Promise<Leccion[]> {
  const rows = await ex
    .select()
    .from(cursoLecciones)
    .where(eq(cursoLecciones.moduloId, moduloId))
    .orderBy(asc(cursoLecciones.orden))
  return rows.map(mapLeccion)
}

/**
 * Lecciones de VARIOS módulos en una sola query (agrupadas en memoria por
 * `moduloId`). Evita el N+1 de llamar `listarLeccionesDeModulo` en un loop —
 * usado por `obtenerDetalle` y `construirResultadoIngreso`, ambos ensamblan el
 * mismo árbol curso→módulos→lecciones.
 */
async function listarLeccionesDeModulos(
  moduloIds: string[],
  ex: Ejecutor = db,
): Promise<Map<string, Leccion[]>> {
  const porModulo = new Map<string, Leccion[]>()
  if (moduloIds.length === 0) return porModulo

  const rows = await ex
    .select()
    .from(cursoLecciones)
    .where(inArray(cursoLecciones.moduloId, moduloIds))
    .orderBy(asc(cursoLecciones.moduloId), asc(cursoLecciones.orden))

  for (const row of rows) {
    const leccion = mapLeccion(row)
    const lista = porModulo.get(leccion.moduloId) ?? []
    lista.push(leccion)
    porModulo.set(leccion.moduloId, lista)
  }
  return porModulo
}

/**
 * Arma la forma exacta `IngresoCursoResultado` que devuelven tanto "ingresar al
 * curso" como "completar una lección" — el diseño de "un solo viaje": después de
 * CUALQUIER acción pública, el cliente reemplaza todo su estado local con la
 * respuesta, sin merge ni re-fetch aparte.
 */
async function construirResultadoIngreso(
  tx: Ejecutor,
  cursoId: string,
  documento: string,
): Promise<IngresoCursoResultado> {
  // 1. Curso (proyección mínima) + inscripción (documento ya viene normalizado por el schema Zod).
  const [cur] = await tx.select().from(cursos).where(eq(cursos.id, cursoId)).limit(1)
  if (!cur) throw new ErrorNoEncontrado("El curso no existe.")

  const [insc] = await tx
    .select()
    .from(inscripciones)
    .where(and(eq(inscripciones.cursoId, cursoId), eq(inscripciones.documento, documento)))
    .limit(1)
  if (!insc) throw new ErrorNoEncontrado("No hay una inscripción para este documento en este curso.")

  // 2. Módulos + lecciones (mismo ensamblado que `obtenerDetalle`): 1 query para
  //    los módulos + 1 query batch para todas sus lecciones (sin N+1).
  const modulosBase = await listarModulosDeCurso(cursoId, tx)
  const leccionesPorModulo = await listarLeccionesDeModulos(
    modulosBase.map((m) => m.id),
    tx,
  )

  // 3. Set de lecciones completadas por ESTA inscripción.
  const progresoRows = await tx
    .select({ leccionId: progresoLecciones.leccionId })
    .from(progresoLecciones)
    .where(eq(progresoLecciones.inscripcionId, insc.id))
  const completadasSet = new Set(progresoRows.map((r) => r.leccionId))

  // 4. Ensamblar módulos públicos con el flag `completada` por lección.
  let totalLecciones = 0
  let completadas = 0
  const modulos: CursoModuloPublico[] = modulosBase.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    orden: m.orden,
    lecciones: (leccionesPorModulo.get(m.id) ?? []).map((l) => {
      totalLecciones++
      const completada = completadasSet.has(l.id)
      if (completada) completadas++
      return { ...l, completada }
    }),
  }))

  const curso = mapCurso(cur)
  return {
    inscripcion: mapInscripcion(insc),
    curso: {
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      ambito: curso.ambito,
      estadoRegistro: curso.estadoRegistro,
    },
    modulos,
    progreso: calcularProgreso(totalLecciones, completadas),
  }
}

// ── Repo ──────────────────────────────────────────────────────────────────────

export const cursoRepository: CursoRepo = {
  async listarCursos(filtro: FiltroCursos): Promise<ResultadoPaginado<Curso>> {
    const pagina = filtro.pagina ?? 1
    const porPagina = filtro.porPagina ?? 10
    const offset = (pagina - 1) * porPagina

    const condiciones = []
    if (filtro.ambito) condiciones.push(eq(cursos.ambito, filtro.ambito))
    if (filtro.estado) condiciones.push(eq(cursos.estadoRegistro, filtro.estado))
    if (filtro.q) condiciones.push(ilike(cursos.titulo, `%${filtro.q}%`))

    const where = condiciones.length > 0 ? and(...condiciones) : undefined

    const [totalRow] = await db.select({ n: count() }).from(cursos).where(where)
    const total = Number(totalRow?.n ?? 0)
    const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

    const rows = await db
      .select()
      .from(cursos)
      .where(where)
      .orderBy(asc(cursos.titulo))
      .limit(porPagina)
      .offset(offset)

    // Conteo de inscritos por curso en una sola query agrupada (sin N+1) — el
    // dato "hero" de Cursos, visible en el listado sin entrar al detalle.
    const ids = rows.map((r) => r.id)
    const inscritosPorCurso = new Map<string, number>()
    if (ids.length > 0) {
      const conteos = await db
        .select({ cursoId: inscripciones.cursoId, n: count() })
        .from(inscripciones)
        .where(inArray(inscripciones.cursoId, ids))
        .groupBy(inscripciones.cursoId)
      for (const c of conteos) inscritosPorCurso.set(c.cursoId, Number(c.n))
    }

    return {
      items: rows.map((r) => mapCurso(r, inscritosPorCurso.get(r.id) ?? 0)),
      total,
      pagina,
      porPagina,
      totalPaginas,
    }
  },

  async crearCurso(
    input: Omit<
      Curso,
      "id" | "token" | "estadoRegistro" | "createdAt" | "updatedAt" | "totalInscritos"
    >,
  ): Promise<Curso> {
    // Token aleatorio URL-safe de 22 caracteres (~131 bits de entropía).
    const token = randomBytes(16).toString("base64url")

    const [row] = await db
      .insert(cursos)
      .values({
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        ambito: input.ambito,
        token,
        estadoRegistro: "BORRADOR",
        creadaPor: input.creadaPor ?? null,
      })
      .returning()

    if (!row) throw new Error("crearCurso: la inserción no devolvió el registro.")
    return mapCurso(row)
  },

  async obtenerDetalle(id: string): Promise<CursoDetalle | null> {
    const [cur] = await db.select().from(cursos).where(eq(cursos.id, id)).limit(1)
    if (!cur) return null

    const moduloRows = await listarModulosDeCurso(id)
    const leccionesPorModulo = await listarLeccionesDeModulos(moduloRows.map((m) => m.id))

    const modulos: CursoModuloConLecciones[] = moduloRows.map((m) => ({
      ...m,
      lecciones: leccionesPorModulo.get(m.id) ?? [],
    }))

    const totalLecciones = modulos.reduce((acc, m) => acc + m.lecciones.length, 0)

    const [inscritosRow] = await db
      .select({ n: count() })
      .from(inscripciones)
      .where(eq(inscripciones.cursoId, id))
    const totalInscritos = Number(inscritosRow?.n ?? 0)

    return {
      curso: mapCurso(cur, totalInscritos),
      modulos,
      totalLecciones,
      totalInscritos,
    }
  },

  async editarCurso(
    id: string,
    input: Partial<Pick<Curso, "titulo" | "descripcion" | "ambito">>,
  ): Promise<Curso> {
    const set: Record<string, unknown> = { updatedAt: new Date() }
    if (input.titulo !== undefined) set.titulo = input.titulo
    if (input.descripcion !== undefined) set.descripcion = input.descripcion
    if (input.ambito !== undefined) set.ambito = input.ambito

    const [row] = await db.update(cursos).set(set).where(eq(cursos.id, id)).returning()
    if (!row) throw new ErrorNoEncontrado("El curso no existe.")
    return mapCurso(row)
  },

  async cambiarEstadoRegistro(
    id: string,
    estado: Curso["estadoRegistro"],
    estadoEsperado: Curso["estadoRegistro"],
  ): Promise<Curso> {
    // El UPDATE condicionado al estado esperado cierra el TOCTOU: la lectura
    // que valida la transición (en el caso de uso) y la escritura no son la
    // misma operación atómica sin esto.
    const [row] = await db
      .update(cursos)
      .set({ estadoRegistro: estado, updatedAt: new Date() })
      .where(and(eq(cursos.id, id), eq(cursos.estadoRegistro, estadoEsperado)))
      .returning()

    if (row) return mapCurso(row)

    // 0 filas: distinguir "no existe" de "ya cambió de estado".
    const [actual] = await db.select().from(cursos).where(eq(cursos.id, id)).limit(1)
    if (!actual) throw new ErrorNoEncontrado("El curso no existe.")
    throw new ErrorValidacion("El curso cambió de estado; recargue e intente de nuevo.")
  },

  async crearModulo(cursoId: string, titulo: string): Promise<CursoModulo> {
    return db.transaction(async (tx) => {
      // Idempotencia a nivel de aplicación: doble clic/reintento con el mismo
      // título (normalizado), scopeado a este curso, no crea 2 módulos.
      const yaExiste = await tx
        .select({ id: cursoModulos.id })
        .from(cursoModulos)
        .where(
          and(
            eq(cursoModulos.cursoId, cursoId),
            sql`lower(trim(${cursoModulos.titulo})) = lower(trim(${titulo}))`,
          ),
        )
        .limit(1)
      if (yaExiste.length > 0) {
        throw new ErrorValidacion("Ya existe un módulo con ese título en este curso.")
      }

      // Orden = max + 1 (1 si el curso aún no tiene módulos), scopeado al curso.
      const [agg] = await tx
        .select({ max: sql<number | null>`max(${cursoModulos.orden})` })
        .from(cursoModulos)
        .where(eq(cursoModulos.cursoId, cursoId))
      const orden = (agg?.max ?? 0) + 1

      const [row] = await tx.insert(cursoModulos).values({ cursoId, titulo, orden }).returning()
      if (!row) throw new Error("crearModulo: la inserción no devolvió el registro.")
      return mapCursoModulo(row)
    })
  },

  async editarModulo(cursoId: string, moduloId: string, titulo: string): Promise<CursoModulo> {
    // Acotado al curso padre: un módulo de otro curso no coincide → 404.
    const [row] = await db
      .update(cursoModulos)
      .set({ titulo, updatedAt: new Date() })
      .where(and(eq(cursoModulos.id, moduloId), eq(cursoModulos.cursoId, cursoId)))
      .returning()

    if (!row) throw new ErrorNoEncontrado("El módulo no existe.")
    return mapCursoModulo(row)
  },

  async moverModulo(
    cursoId: string,
    moduloId: string,
    direccion: "subir" | "bajar",
  ): Promise<CursoModulo[]> {
    return db.transaction(async (tx) => {
      // Lock pesimista sobre el curso: serializa dos reordenamientos concurrentes
      // del mismo curso (evita lost-update / choque con unique(curso_id, orden)).
      await tx.select({ id: cursos.id }).from(cursos).where(eq(cursos.id, cursoId)).for("update")

      const [actual] = await tx
        .select({ id: cursoModulos.id, orden: cursoModulos.orden })
        .from(cursoModulos)
        // Acotado al curso padre: no se reordena un módulo de otro curso (I1).
        .where(and(eq(cursoModulos.id, moduloId), eq(cursoModulos.cursoId, cursoId)))
        .limit(1)
      if (!actual) throw new ErrorNoEncontrado("El módulo no existe.")

      // Vecino inmediato DENTRO DEL MISMO CURSO: `orden` es único por padre
      // (`unique(curso_id, orden)`), no global como en `areas`.
      const ordenVecino = direccion === "subir" ? actual.orden - 1 : actual.orden + 1
      const [vecino] = await tx
        .select({ id: cursoModulos.id, orden: cursoModulos.orden })
        .from(cursoModulos)
        .where(and(eq(cursoModulos.cursoId, cursoId), eq(cursoModulos.orden, ordenVecino)))
        .limit(1)
      // En los extremos no hay vecino: no-op.
      if (!vecino) return listarModulosDeCurso(cursoId, tx)

      // Swap con sentinela temporal para no violar unique(curso_id, orden).
      await tx.update(cursoModulos).set({ orden: -1 }).where(eq(cursoModulos.id, actual.id))
      await tx.update(cursoModulos).set({ orden: actual.orden }).where(eq(cursoModulos.id, vecino.id))
      await tx.update(cursoModulos).set({ orden: vecino.orden }).where(eq(cursoModulos.id, actual.id))

      return listarModulosDeCurso(cursoId, tx)
    })
  },

  async eliminarModulo(cursoId: string, moduloId: string): Promise<void> {
    // Acotado al curso padre; ON DELETE CASCADE se encarga de las lecciones hijas.
    await db
      .delete(cursoModulos)
      .where(and(eq(cursoModulos.id, moduloId), eq(cursoModulos.cursoId, cursoId)))
  },

  async crearLeccion(
    cursoId: string,
    moduloId: string,
    input: Pick<Leccion, "titulo" | "tipoContenido" | "contenidoTexto" | "urlVideo">,
  ): Promise<Leccion> {
    return db.transaction(async (tx) => {
      // El módulo debe pertenecer a ESTE curso antes de insertarle una lección.
      const [mod] = await tx
        .select({ id: cursoModulos.id })
        .from(cursoModulos)
        .where(and(eq(cursoModulos.id, moduloId), eq(cursoModulos.cursoId, cursoId)))
        .limit(1)
      if (!mod) throw new ErrorNoEncontrado("El módulo no existe.")

      // Idempotencia a nivel de aplicación: doble clic/reintento con el mismo
      // título (normalizado), scopeado a este módulo, no crea 2 lecciones.
      const yaExiste = await tx
        .select({ id: cursoLecciones.id })
        .from(cursoLecciones)
        .where(
          and(
            eq(cursoLecciones.moduloId, moduloId),
            sql`lower(trim(${cursoLecciones.titulo})) = lower(trim(${input.titulo}))`,
          ),
        )
        .limit(1)
      if (yaExiste.length > 0) {
        throw new ErrorValidacion("Ya existe una lección con ese título en este módulo.")
      }

      const [agg] = await tx
        .select({ max: sql<number | null>`max(${cursoLecciones.orden})` })
        .from(cursoLecciones)
        .where(eq(cursoLecciones.moduloId, moduloId))
      const orden = (agg?.max ?? 0) + 1

      const [row] = await tx
        .insert(cursoLecciones)
        .values({
          moduloId,
          titulo: input.titulo,
          tipoContenido: input.tipoContenido,
          contenidoTexto: input.contenidoTexto,
          urlVideo: input.urlVideo,
          orden,
        })
        .returning()
      if (!row) throw new Error("crearLeccion: la inserción no devolvió el registro.")
      return mapLeccion(row)
    })
  },

  async editarLeccion(
    cursoId: string,
    leccionId: string,
    input: Partial<Pick<Leccion, "titulo" | "tipoContenido" | "contenidoTexto" | "urlVideo">>,
  ): Promise<Leccion> {
    // La lección debe pertenecer a un módulo de ESTE curso (defensa en
    // profundidad, mismo innerJoin que `marcarLeccionCompletada`).
    const [pertenece] = await db
      .select({ id: cursoLecciones.id })
      .from(cursoLecciones)
      .innerJoin(cursoModulos, eq(cursoLecciones.moduloId, cursoModulos.id))
      .where(and(eq(cursoLecciones.id, leccionId), eq(cursoModulos.cursoId, cursoId)))
      .limit(1)
    if (!pertenece) throw new ErrorNoEncontrado("La lección no existe.")

    const set: Record<string, unknown> = { updatedAt: new Date() }
    if (input.titulo !== undefined) set.titulo = input.titulo
    if (input.tipoContenido !== undefined) set.tipoContenido = input.tipoContenido
    if (input.contenidoTexto !== undefined) set.contenidoTexto = input.contenidoTexto
    if (input.urlVideo !== undefined) set.urlVideo = input.urlVideo

    const [row] = await db
      .update(cursoLecciones)
      .set(set)
      .where(eq(cursoLecciones.id, leccionId))
      .returning()

    if (!row) throw new ErrorNoEncontrado("La lección no existe.")
    return mapLeccion(row)
  },

  async moverLeccion(
    moduloId: string,
    leccionId: string,
    direccion: "subir" | "bajar",
  ): Promise<Leccion[]> {
    return db.transaction(async (tx) => {
      // Lock pesimista sobre el módulo: serializa dos reordenamientos concurrentes
      // del mismo módulo (evita lost-update / choque con unique(modulo_id, orden)).
      await tx
        .select({ id: cursoModulos.id })
        .from(cursoModulos)
        .where(eq(cursoModulos.id, moduloId))
        .for("update")

      const [actual] = await tx
        .select({ id: cursoLecciones.id, orden: cursoLecciones.orden })
        .from(cursoLecciones)
        // Acotado al módulo padre: no se reordena una lección de otro módulo (I1).
        .where(and(eq(cursoLecciones.id, leccionId), eq(cursoLecciones.moduloId, moduloId)))
        .limit(1)
      if (!actual) throw new ErrorNoEncontrado("La lección no existe.")

      // Vecino inmediato DENTRO DEL MISMO MÓDULO (`unique(modulo_id, orden)`).
      const ordenVecino = direccion === "subir" ? actual.orden - 1 : actual.orden + 1
      const [vecino] = await tx
        .select({ id: cursoLecciones.id, orden: cursoLecciones.orden })
        .from(cursoLecciones)
        .where(and(eq(cursoLecciones.moduloId, moduloId), eq(cursoLecciones.orden, ordenVecino)))
        .limit(1)
      if (!vecino) return listarLeccionesDeModulo(moduloId, tx)

      await tx.update(cursoLecciones).set({ orden: -1 }).where(eq(cursoLecciones.id, actual.id))
      await tx
        .update(cursoLecciones)
        .set({ orden: actual.orden })
        .where(eq(cursoLecciones.id, vecino.id))
      await tx
        .update(cursoLecciones)
        .set({ orden: vecino.orden })
        .where(eq(cursoLecciones.id, actual.id))

      return listarLeccionesDeModulo(moduloId, tx)
    })
  },

  async eliminarLeccion(cursoId: string, leccionId: string): Promise<void> {
    // La lección debe pertenecer a un módulo de ESTE curso antes de borrarla.
    const [pertenece] = await db
      .select({ id: cursoLecciones.id })
      .from(cursoLecciones)
      .innerJoin(cursoModulos, eq(cursoLecciones.moduloId, cursoModulos.id))
      .where(and(eq(cursoLecciones.id, leccionId), eq(cursoModulos.cursoId, cursoId)))
      .limit(1)
    if (!pertenece) throw new ErrorNoEncontrado("La lección no existe.")

    await db.delete(cursoLecciones).where(eq(cursoLecciones.id, leccionId))
  },

  async listarInscritos(cursoId: string): Promise<InscritoConProgreso[]> {
    const [totalRow] = await db
      .select({ n: count() })
      .from(cursoLecciones)
      .innerJoin(cursoModulos, eq(cursoLecciones.moduloId, cursoModulos.id))
      .where(eq(cursoModulos.cursoId, cursoId))
    const totalLecciones = Number(totalRow?.n ?? 0)

    // Panel "en vivo": los inscritos más recientemente activos primero.
    const inscripcionRows = await db
      .select()
      .from(inscripciones)
      .where(eq(inscripciones.cursoId, cursoId))
      .orderBy(desc(inscripciones.ultimaActividadEn))

    const progresoRows = await db
      .select({ inscripcionId: progresoLecciones.inscripcionId, n: count() })
      .from(progresoLecciones)
      .innerJoin(inscripciones, eq(progresoLecciones.inscripcionId, inscripciones.id))
      .where(eq(inscripciones.cursoId, cursoId))
      .groupBy(progresoLecciones.inscripcionId)

    const completadasPorInscripcion = new Map<string, number>()
    for (const row of progresoRows) {
      completadasPorInscripcion.set(row.inscripcionId, Number(row.n))
    }

    return inscripcionRows.map((row) => {
      const inscripcion = mapInscripcion(row)
      const completadas = completadasPorInscripcion.get(inscripcion.id) ?? 0
      const { porcentaje } = calcularProgreso(totalLecciones, completadas)
      return {
        inscripcionId: inscripcion.id,
        nombre: inscripcion.nombre,
        documento: inscripcion.documento,
        totalLecciones,
        completadas,
        porcentaje,
        iniciadaEn: inscripcion.iniciadaEn,
        ultimaActividadEn: inscripcion.ultimaActividadEn,
      }
    })
  },

  async obtenerPorToken(token: string): Promise<CursoPublico | null> {
    const [cur] = await db.select().from(cursos).where(eq(cursos.token, token)).limit(1)
    if (!cur) return null

    const [modulosCountRow] = await db
      .select({ n: count() })
      .from(cursoModulos)
      .where(eq(cursoModulos.cursoId, cur.id))
    const [leccionesCountRow] = await db
      .select({ n: count() })
      .from(cursoLecciones)
      .innerJoin(cursoModulos, eq(cursoLecciones.moduloId, cursoModulos.id))
      .where(eq(cursoModulos.cursoId, cur.id))

    return {
      titulo: cur.titulo,
      descripcion: cur.descripcion,
      ambito: cur.ambito,
      estadoRegistro: cur.estadoRegistro,
      totalModulos: Number(modulosCountRow?.n ?? 0),
      totalLecciones: Number(leccionesCountRow?.n ?? 0),
    }
  },

  async ingresarInscripcion(
    token: string,
    datos: { nombre: string; documento: string },
  ): Promise<IngresoCursoResultado> {
    return db.transaction(async (tx) => {
      const [cur] = await tx.select().from(cursos).where(eq(cursos.token, token)).limit(1)
      if (!cur) throw new ErrorNoEncontrado("El curso no existe.")
      if (!cursoAccesible(cur.estadoRegistro)) {
        throw new ErrorValidacion("Este curso aún no está disponible.")
      }

      // Idempotente: UNIQUE(curso_id, documento) → gana el primer nombre escrito,
      // sin duplicar ni pisar el nombre ya registrado.
      await tx
        .insert(inscripciones)
        .values({ cursoId: cur.id, documento: datos.documento, nombre: datos.nombre })
        .onConflictDoNothing({ target: [inscripciones.cursoId, inscripciones.documento] })

      // Actualiza el "visto por última vez" siempre, incluso si el curso está
      // CERRADO — le da al gestor una señal de actividad genuinamente en vivo.
      await tx
        .update(inscripciones)
        .set({ ultimaActividadEn: new Date() })
        .where(and(eq(inscripciones.cursoId, cur.id), eq(inscripciones.documento, datos.documento)))

      return construirResultadoIngreso(tx, cur.id, datos.documento)
    })
  },

  async marcarLeccionCompletada(
    token: string,
    documento: string,
    leccionId: string,
  ): Promise<IngresoCursoResultado> {
    return db.transaction(async (tx) => {
      const [cur] = await tx.select().from(cursos).where(eq(cursos.token, token)).limit(1)
      if (!cur) throw new ErrorNoEncontrado("El curso no existe.")
      // Sin chequeo de `cursoAccesible`/BORRADOR aquí a propósito: un curso en
      // BORRADOR no puede tener inscripciones (nadie pasó por
      // `ingresarInscripcion`), y un curso CERRADO debe seguir permitiendo
      // completar lecciones a quien ya estaba inscrito.

      const [insc] = await tx
        .select()
        .from(inscripciones)
        .where(and(eq(inscripciones.cursoId, cur.id), eq(inscripciones.documento, documento)))
        .limit(1)
      if (!insc) {
        throw new ErrorNoEncontrado("No hay una inscripción para este documento en este curso.")
      }

      // Verificación de pertenencia: `leccionId` debe pertenecer a un módulo de
      // ESTE curso — evita que un cliente malicioso contamine el progreso de
      // esta inscripción con una lección de otro curso.
      const [pertenece] = await tx
        .select({ id: cursoLecciones.id })
        .from(cursoLecciones)
        .innerJoin(cursoModulos, eq(cursoLecciones.moduloId, cursoModulos.id))
        .where(and(eq(cursoLecciones.id, leccionId), eq(cursoModulos.cursoId, cur.id)))
        .limit(1)
      if (!pertenece) throw new ErrorValidacion("La lección no pertenece a este curso.")

      // Idempotente: UNIQUE(inscripcion_id, leccion_id) → doble clic no duplica ni falla.
      await tx
        .insert(progresoLecciones)
        .values({ inscripcionId: insc.id, leccionId })
        .onConflictDoNothing({ target: [progresoLecciones.inscripcionId, progresoLecciones.leccionId] })

      await tx
        .update(inscripciones)
        .set({ ultimaActividadEn: new Date() })
        .where(and(eq(inscripciones.cursoId, cur.id), eq(inscripciones.documento, documento)))

      return construirResultadoIngreso(tx, cur.id, documento)
    })
  },
}
