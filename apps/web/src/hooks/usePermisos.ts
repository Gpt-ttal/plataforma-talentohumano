import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { NivelPermiso, RolUsuario } from "@pys/shared"
import { modulosVisiblesDesdeMatriz } from "@pys/shared"
import { apiPermisos } from "../lib/api"
import { useAuth } from "../context/AuthContext"

/** Matriz completa de permisos rol × módulo (solo SUPERADMIN). */
export function usePermisosMatriz(enabled = true) {
  return useQuery({
    queryKey: ["permisos", "matriz"],
    queryFn: () => apiPermisos.matriz(),
    enabled,
  })
}

/** Guarda los permisos de un rol. Invalida matriz y la visibilidad propia. */
export function useActualizarPermisosRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      rol,
      celdas,
    }: {
      rol: RolUsuario
      celdas: { moduloId: string; nivel: NivelPermiso }[]
    }) => apiPermisos.actualizarRol(rol, celdas),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["permisos"] })
    },
  })
}

/**
 * Mapea una ruta del sidebar/lanzador al `id` del módulo cuya visibilidad la
 * gobierna, o `null` si la ruta no pertenece a un módulo (siempre visible: inicio,
 * usuarios, configuración). La matriz solo FILTRA sobre lo que ya existe.
 */
export function moduloDeRuta(href: string): string | null {
  const path = href.split("?")[0] ?? href
  if (path.startsWith("/personal") || path.startsWith("/desvinculaciones")) return "personal"
  if (path.startsWith("/vacantes")) return "vacantes"
  if (path.startsWith("/sync-personal")) return "sync-personal"
  if (
    path.startsWith("/capacitaciones") ||
    path.startsWith("/cursos") ||
    path.startsWith("/planificador")
  )
    return "capacitaciones"
  if (
    path.startsWith("/paz-y-salvo") ||
    path.startsWith("/areas") ||
    path.startsWith("/archivo")
  )
    return "paz-y-salvo"
  return null
}

/**
 * Conjunto de módulos visibles para el usuario, derivado del rol EFECTIVO (refleja
 * la impersonación del SA). Para el SA real se computa desde la matriz completa que
 * ya trae la Configuración (sin pegarle al backend con otro rol); para el resto se
 * consulta `/permisos/mios`. Devuelve `null` mientras carga o si falla → el llamador
 * cae a mostrar todo (`modulosParaRol`), nunca a ocultar por error.
 */
export function useModulosVisibles(): Set<string> | null {
  const { usuario, usuarioReal } = useAuth()
  const esSaReal = usuarioReal?.rol === "SUPERADMIN"

  const matriz = usePermisosMatriz(esSaReal)
  const mios = useQuery({
    queryKey: ["permisos", "mios"],
    queryFn: () => apiPermisos.mios(),
    enabled: !!usuario && !esSaReal,
  })

  return useMemo(() => {
    if (!usuario) return null
    if (esSaReal) {
      if (!matriz.data) return null
      return new Set(modulosVisiblesDesdeMatriz(matriz.data, usuario.rol))
    }
    if (!mios.data) return null
    return new Set(mios.data)
  }, [usuario, esSaReal, matriz.data, mios.data])
}
