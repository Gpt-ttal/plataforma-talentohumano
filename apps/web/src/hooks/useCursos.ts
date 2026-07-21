import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FiltroCursos } from "@pys/shared"
import { apiCursos } from "../lib/api"

const CLAVE = "cursos"

/**
 * Listado paginado de cursos con filtros (q, ambito, estado, pagina). El
 * backend filtra el ámbito por rol: TH solo ve TH, SST solo SST, SA ve ambos.
 */
export function useCursos(filtro: FiltroCursos = {}) {
  return useQuery({
    queryKey: [CLAVE, filtro],
    queryFn: () => apiCursos.listar(filtro),
  })
}

/** Detalle completo de un curso: estructura módulos→lecciones + conteos. */
export function useCursoDetalle(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "detalle", id],
    queryFn: () => apiCursos.detalle(id!),
    enabled: !!id,
  })
}

/**
 * Inscritos con su progreso agregado, refrescado cada 5s mientras el panel
 * está montado — el mecanismo de "ver el avance en vivo" durante la demo.
 */
export function useInscritosCurso(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "inscritos", id],
    queryFn: () => apiCursos.inscritos(id!),
    enabled: !!id,
    refetchInterval: 5000,
  })
}

function useMutacionCurso<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

export function useCrearCurso() {
  return useMutacionCurso((input: Parameters<typeof apiCursos.crear>[0]) =>
    apiCursos.crear(input),
  )
}

export function useEditarCurso() {
  return useMutacionCurso(
    (args: { id: string; input: Parameters<typeof apiCursos.editar>[1] }) =>
      apiCursos.editar(args.id, args.input),
  )
}

export function useAbrirRegistroCurso() {
  return useMutacionCurso((id: string) => apiCursos.abrirRegistro(id))
}

export function useCerrarRegistroCurso() {
  return useMutacionCurso((id: string) => apiCursos.cerrarRegistro(id))
}

export function useCrearModulo() {
  return useMutacionCurso((args: { cursoId: string; titulo: string }) =>
    apiCursos.crearModulo(args.cursoId, args.titulo),
  )
}

export function useEditarModulo() {
  return useMutacionCurso(
    (args: { cursoId: string; moduloId: string; titulo: string }) =>
      apiCursos.editarModulo(args.cursoId, args.moduloId, args.titulo),
  )
}

export function useMoverModulo() {
  return useMutacionCurso(
    (args: { cursoId: string; moduloId: string; direccion: "subir" | "bajar" }) =>
      apiCursos.moverModulo(args.cursoId, args.moduloId, args.direccion),
  )
}

export function useEliminarModulo() {
  return useMutacionCurso((args: { cursoId: string; moduloId: string }) =>
    apiCursos.eliminarModulo(args.cursoId, args.moduloId),
  )
}

export function useCrearLeccion() {
  return useMutacionCurso(
    (args: {
      cursoId: string
      moduloId: string
      input: Parameters<typeof apiCursos.crearLeccion>[2]
    }) => apiCursos.crearLeccion(args.cursoId, args.moduloId, args.input),
  )
}

export function useEditarLeccion() {
  return useMutacionCurso(
    (args: {
      cursoId: string
      moduloId: string
      leccionId: string
      input: Parameters<typeof apiCursos.editarLeccion>[3]
    }) => apiCursos.editarLeccion(args.cursoId, args.moduloId, args.leccionId, args.input),
  )
}

export function useMoverLeccion() {
  return useMutacionCurso(
    (args: {
      cursoId: string
      moduloId: string
      leccionId: string
      direccion: "subir" | "bajar"
    }) => apiCursos.moverLeccion(args.cursoId, args.moduloId, args.leccionId, args.direccion),
  )
}

export function useEliminarLeccion() {
  return useMutacionCurso(
    (args: { cursoId: string; moduloId: string; leccionId: string }) =>
      apiCursos.eliminarLeccion(args.cursoId, args.moduloId, args.leccionId),
  )
}
