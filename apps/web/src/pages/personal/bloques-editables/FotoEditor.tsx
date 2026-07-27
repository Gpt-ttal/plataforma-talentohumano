import { useState } from "react"
import { toast } from "sonner"
import { Avatar } from "../../../components/ui/Avatar"
import { useEliminarFoto, useFotoUrl, useSubirFoto } from "../../../hooks/usePersonal"
import { mensajeError } from "./compartido"

// ── Foto (Storage) ────────────────────────────────────────────────────────────

const EXTENSIONES_ACEPTADAS = "image/jpeg,image/png,image/webp"

export function FotoEditor({
  empleadoId,
  nombre,
  tieneFoto,
}: {
  empleadoId: string
  nombre: string
  tieneFoto: boolean
}) {
  const { data: foto, isLoading } = useFotoUrl(empleadoId, tieneFoto)
  const subir = useSubirFoto(empleadoId)
  const eliminar = useEliminarFoto()
  const [error, setError] = useState<string | null>(null)
  const pending = subir.isPending || eliminar.isPending

  async function manejarArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    try {
      await subir.mutateAsync(archivo)
      toast.success("Foto actualizada.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.")
    }
  }

  async function quitar() {
    setError(null)
    try {
      await eliminar.mutateAsync(empleadoId)
      toast.success("Foto eliminada.")
    } catch (e) {
      setError(mensajeError(e, "No se pudo eliminar la foto."))
    }
  }

  return (
    <div className="flex items-start gap-3">
      {tieneFoto && foto?.url ? (
        <img
          src={foto.url}
          alt={nombre}
          loading="lazy"
          decoding="async"
          className="h-14 w-14 shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-gold-200/60"
        />
      ) : (
        <Avatar nombre={nombre} size="lg" />
      )}
      <div className="flex flex-col gap-1">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-navy-700 hover:text-gold-600 dark:text-foreground">
          {isLoading && tieneFoto ? "Cargando…" : pending ? "Subiendo…" : "Cambiar foto"}
          <input
            type="file"
            accept={EXTENSIONES_ACEPTADAS}
            className="hidden"
            disabled={pending}
            onChange={(ev) => void manejarArchivo(ev.target.files?.[0])}
          />
        </label>
        {tieneFoto && (
          <button
            type="button"
            onClick={() => void quitar()}
            disabled={pending}
            className="inline-flex min-h-[44px] items-center text-left text-sm font-medium text-silver-600 hover:text-estado-rechazo"
          >
            Quitar foto
          </button>
        )}
        {error && (
          <p role="alert" className="max-w-[12rem] text-sm text-estado-rechazo">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
