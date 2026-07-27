import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { invalidarVistasTramite } from "../hooks/useFuncionarios"
import { supabase } from "./supabase"

/**
 * Sincronía en vivo multi-usuario. Un único canal por sesión autenticada,
 * suscrito a cambios en las tablas de Paz y Salvo, Capacitaciones, Cursos,
 * Planificador, Vacantes, el expediente 360° de Personal, la importación
 * masiva de desvinculaciones y los catálogos de Áreas y Usuarios.
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
  // Fuente ÚNICA de invalidación de trámite: se delega en el mismo helper que
  // usan las mutaciones (`invalidarVistasTramite`) para que el realtime y las
  // mutaciones nunca diverjan. Cubre además `["expediente"]` (Archivo) e invalida
  // `["funcionario"]` por prefijo (todos los detalles), así que ya no hace falta
  // extraer el id del payload.
  const invalidarTramite = () => invalidarVistasTramite(qc)
  const invalidarCursos = () => qc.invalidateQueries({ queryKey: ["cursos"] })
  const invalidarCapacitaciones = () => qc.invalidateQueries({ queryKey: ["capacitaciones"] })
  const invalidarPlanificador = () => qc.invalidateQueries({ queryKey: ["planificador"] })
  const invalidarPersonal = () => qc.invalidateQueries({ queryKey: ["personal"] })
  const invalidarImportacion = () => qc.invalidateQueries({ queryKey: ["importacion"] })
  const invalidarVacantes = () => {
    qc.invalidateQueries({ queryKey: ["vacantes"] })
    // Contratar una vacante crea un funcionario (puente ADR-0009): el maestro de
    // Personal debe refrescarse aunque el cambio se originara en Vacantes.
    qc.invalidateQueries({ queryKey: ["personal"] })
  }
  const invalidarAreas = () => {
    qc.invalidateQueries({ queryKey: ["areas"] })
    qc.invalidateQueries({ queryKey: ["areas-admin"] })
    // Renombrar/reordenar cambia columnas de la matriz y la cola de Mi Área sin
    // tocar `funcionarios`; refréscalas también.
    qc.invalidateQueries({ queryKey: ["matriz"] })
    qc.invalidateQueries({ queryKey: ["mi-area"] })
  }
  const invalidarUsuarios = () => qc.invalidateQueries({ queryKey: ["usuarios"] })

  // Se avisa una sola vez por caída (bandera local) para no ser ruidoso en
  // reintentos sucesivos; se resetea en silencio al volver a SUBSCRIBED.
  let avisoMostrado = false

  const canal = supabase
    .channel("plataforma-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "funcionarios" },
      invalidarTramite,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "aprobaciones" },
      invalidarTramite,
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
    .on("postgres_changes", { event: "*", schema: "public", table: "vacantes" }, invalidarVacantes)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "capacitaciones" },
      invalidarCapacitaciones,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "asistencias" },
      invalidarCapacitaciones,
    )
    // Requiere `areas`/`usuarios` en la publicación realtime (ALTER PUBLICATION,
    // gated). Sin eso la suscripción es inocua: simplemente no recibe eventos.
    .on("postgres_changes", { event: "*", schema: "public", table: "areas" }, invalidarAreas)
    .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, invalidarUsuarios)
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
