import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "./supabase"

/**
 * Sincronía en vivo multi-usuario. Un único canal por sesión autenticada,
 * suscrito a cambios en las tablas de Paz y Salvo, Cursos, Planificador, el
 * expediente 360° de Personal y la importación masiva de desvinculaciones.
 * Cada evento invalida las vistas de TanStack Query que dependen de esa
 * tabla → refetch solo de lo necesario.
 *
 * La conexión WebSocket va directo browser↔Supabase (no pasa por Vercel) y
 * respeta RLS: el usuario solo recibe eventos de filas que su política SELECT
 * le permite ver. No se necesita filtro adicional en el cliente.
 *
 * Devuelve una función de limpieza que remueve el canal (llamar en logout /
 * desmontaje).
 */
export function suscribirRealtime(qc: QueryClient): () => void {
  const invalidarTramite = (id?: string) => {
    qc.invalidateQueries({ queryKey: ["funcionarios"] })
    qc.invalidateQueries({ queryKey: ["funcionarios-todos"] })
    qc.invalidateQueries({ queryKey: ["metricas"] })
    qc.invalidateQueries({ queryKey: ["matriz"] })
    qc.invalidateQueries({ queryKey: ["mi-area"] })
    qc.invalidateQueries({ queryKey: ["archivo"] })
    qc.invalidateQueries({ queryKey: ["personal"] })
    if (id) qc.invalidateQueries({ queryKey: ["funcionario", id] })
  }
  const invalidarCursos = () => qc.invalidateQueries({ queryKey: ["cursos"] })
  const invalidarPlanificador = () => qc.invalidateQueries({ queryKey: ["planificador"] })
  const invalidarPersonal = () => qc.invalidateQueries({ queryKey: ["personal"] })
  const invalidarImportacion = () => qc.invalidateQueries({ queryKey: ["importacion"] })

  // Se avisa una sola vez por caída (bandera local) para no ser ruidoso en
  // reintentos sucesivos; se resetea en silencio al volver a SUBSCRIBED.
  let avisoMostrado = false

  const canal = supabase
    .channel("plataforma-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "funcionarios" },
      (payload) => {
        const fila = (payload.new ?? payload.old) as { id?: string } | null
        invalidarTramite(fila?.id)
      },
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "aprobaciones" },
      (payload) => {
        const fila = (payload.new ?? payload.old) as { funcionario_id?: string } | null
        invalidarTramite(fila?.funcionario_id)
      },
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "cursos" }, invalidarCursos)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "curso_modulos" },
      invalidarCursos,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "curso_lecciones" },
      invalidarCursos,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "inscripciones" },
      invalidarCursos,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "progreso_lecciones" },
      invalidarCursos,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "capacitaciones_planeadas" },
      invalidarPlanificador,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "empleado_personales" },
      invalidarPersonal,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "empleado_familiares" },
      invalidarPersonal,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "empleado_formacion" },
      invalidarPersonal,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "empleado_experiencia" },
      invalidarPersonal,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "empleado_salarial" },
      invalidarPersonal,
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "novedades" }, invalidarPersonal)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "lotes_importacion" },
      invalidarImportacion,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "filas_lote" },
      invalidarImportacion,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        avisoMostrado = false
        return
      }
      if (
        (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") &&
        !avisoMostrado
      ) {
        avisoMostrado = true
        console.warn("[realtime] canal plataforma-sync:", status)
        toast.warning("Se perdió la sincronía en vivo. Actualiza la página si algo no cambia.")
      }
    })

  return () => {
    void supabase.removeChannel(canal)
  }
}
