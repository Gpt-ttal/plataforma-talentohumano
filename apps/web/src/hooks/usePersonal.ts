import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  CrearEmpleadoInput,
  CrearExperienciaInput,
  CrearFamiliarInput,
  CrearFormacionInput,
  EditarContractualInput,
  EditarEmpleadoInput,
  FiltroEmpleados,
  GuardarPersonalesInput,
  GuardarSalarialInput,
  RegistrarNovedadInput,
} from "@pys/shared"
import { apiPersonal, BUCKET_FOTOS_EMPLEADOS } from "../lib/api"
import { supabase } from "../lib/supabase"
import { invalidarVistasTramite } from "./useFuncionarios"

const CLAVE = "personal"

/** Toda mutación de un bloque satélite invalida el maestro (incl. el expediente). */
function useMutacionBloque<TArgs, TResultado>(fn: (args: TArgs) => Promise<TResultado>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

/** Listado paginado del maestro de empleados (incluye ACTIVO, a diferencia del catálogo de trámite). */
export function usePersonal(filtro: FiltroEmpleados = {}) {
  return useQuery({
    queryKey: [CLAVE, filtro],
    queryFn: () => apiPersonal.listar(filtro),
  })
}

/** Ficha de un empleado: núcleo + historial de novedades. */
export function useEmpleadoDetalle(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "detalle", id],
    queryFn: () => apiPersonal.detalle(id!),
    enabled: !!id,
  })
}

/** Expediente 360° del empleado (núcleo + bloques satélite + salarial si el rol lo ve). */
export function useExpediente(id: string | undefined) {
  return useQuery({
    queryKey: [CLAVE, "expediente", id],
    queryFn: () => apiPersonal.expediente(id!),
    enabled: !!id,
  })
}

/** Registra un empleado nuevo (nace ACTIVO). Revalida el catálogo. */
export function useCrearEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CrearEmpleadoInput) => apiPersonal.crear(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

/** Edita el núcleo del empleado (datos de identidad/contacto). */
export function useEditarEmpleado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: EditarEmpleadoInput }) =>
      apiPersonal.editar(args.id, args.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

/**
 * Puente a Paz y Salvo: fija `fechaRetiro` y dispara el trámite (backfill de
 * aprobaciones + `recomputarEstado`). Además de revalidar el maestro, invalida
 * TODAS las vistas del trámite (el empleado ahora también es un `Funcionario`).
 */
export function useFinalizarContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; fechaRetiro: string }) =>
      apiPersonal.finalizarContrato(args.id, args.fechaRetiro),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
      invalidarVistasTramite(qc)
    },
  })
}

/** Registra una novedad laboral ("Otro sí" ligero: cambio de cargo o extensión). */
export function useRegistrarNovedad() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; input: RegistrarNovedadInput }) =>
      apiPersonal.registrarNovedad(args.id, args.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

// ── Hoja de vida 360°: captura por bloque satélite (Sprint 2) ─────────────────

/** Upsert del bloque personal (1-1): expedición, nacimiento, contacto. */
export function useGuardarPersonales() {
  return useMutacionBloque((args: { id: string; input: GuardarPersonalesInput }) =>
    apiPersonal.guardarPersonales(args.id, args.input),
  )
}

/** Alta de un familiar a cargo (1-N). */
export function useCrearFamiliar() {
  return useMutacionBloque((args: { id: string; input: CrearFamiliarInput }) =>
    apiPersonal.crearFamiliar(args.id, args.input),
  )
}

export function useEliminarFamiliar() {
  return useMutacionBloque((args: { id: string; familiarId: string }) =>
    apiPersonal.eliminarFamiliar(args.id, args.familiarId),
  )
}

/** Alta de un registro de formación académica (1-N). */
export function useCrearFormacion() {
  return useMutacionBloque((args: { id: string; input: CrearFormacionInput }) =>
    apiPersonal.crearFormacion(args.id, args.input),
  )
}

export function useEliminarFormacion() {
  return useMutacionBloque((args: { id: string; formacionId: string }) =>
    apiPersonal.eliminarFormacion(args.id, args.formacionId),
  )
}

/** Alta de un registro de experiencia laboral previa (1-N). */
export function useCrearExperiencia() {
  return useMutacionBloque((args: { id: string; input: CrearExperienciaInput }) =>
    apiPersonal.crearExperiencia(args.id, args.input),
  )
}

export function useEliminarExperiencia() {
  return useMutacionBloque((args: { id: string; experienciaId: string }) =>
    apiPersonal.eliminarExperiencia(args.id, args.experienciaId),
  )
}

/** Upsert del bloque salarial/prestacional (SENSIBLE, solo SA/TH lo ven y editan). */
export function useGuardarSalarial() {
  return useMutacionBloque((args: { id: string; input: GuardarSalarialInput }) =>
    apiPersonal.guardarSalarial(args.id, args.input),
  )
}

/** Patch del bloque contractual extendido (tipo de contrato, modalidad, área FK, etc.). */
export function useEditarContractual() {
  return useMutacionBloque((args: { id: string; input: EditarContractualInput }) =>
    apiPersonal.editarContractual(args.id, args.input),
  )
}

/**
 * Sube la foto del empleado en 3 pasos: pide una URL firmada de un solo uso,
 * el navegador hace el `PUT` directo al bucket privado (el backend nunca ve los
 * bytes), y confirma la ruta resultante con `guardarFoto`.
 */
export function useSubirFoto(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (archivo: File) => {
      const extension = archivo.name.split(".").pop() ?? "jpg"
      const { path, token } = await apiPersonal.crearUrlSubidaFoto(id, extension)
      const { error } = await supabase.storage
        .from(BUCKET_FOTOS_EMPLEADOS)
        .uploadToSignedUrl(path, token, archivo)
      if (error) throw new Error(error.message)
      return apiPersonal.guardarFoto(id, path)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CLAVE] })
    },
  })
}

/** Quita la foto actual (vuelve al fallback de iniciales). */
export function useEliminarFoto() {
  return useMutacionBloque((id: string) => apiPersonal.guardarFoto(id, null))
}

/** URL firmada de lectura de la foto (1h de vida); solo se pide si `fotoPath` existe. */
export function useFotoUrl(id: string | undefined, tieneFoto: boolean) {
  return useQuery({
    queryKey: [CLAVE, "foto-url", id],
    queryFn: () => apiPersonal.obtenerUrlFoto(id!),
    enabled: !!id && tieneFoto,
    staleTime: 50 * 60_000,
  })
}
