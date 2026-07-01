import { useState } from "react"
import type { AreaVistoBueno } from "@pys/shared"
import {
  useCambiarActivaArea,
  useMoverArea,
  useRenombrarArea,
} from "../../hooks/useAreas"
import { ApiError } from "../../lib/api"

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Edición de una dependencia: renombrar, reordenar (subir/bajar) y activar o
 * desactivar. Desactivar cambia el estado global de los funcionarios afectados
 * (D2) → confirmación inline antes de aplicar. El backend autoriza (solo SA) y
 * recalcula; aquí solo se refleja. Las mutaciones revalidan cuanto depende de
 * las áreas.
 */
export function GestionArea({
  area,
  esPrimera,
  esUltima,
}: {
  area: AreaVistoBueno
  esPrimera: boolean
  esUltima: boolean
}) {
  const renombrar = useRenombrarArea()
  const mover = useMoverArea()
  const cambiarActiva = useCambiarActivaArea()

  const [nombreSel, setNombreSel] = useState(area.nombre)
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const pending = renombrar.isPending || mover.isPending || cambiarActiva.isPending
  const nombreCambio = nombreSel.trim() !== area.nombre && nombreSel.trim().length >= 2

  function manejarError(e: unknown, fallback: string) {
    setError(e instanceof ApiError ? e.message : fallback)
  }

  async function guardarNombre() {
    setError(null)
    setOkMsg(null)
    try {
      await renombrar.mutateAsync({ id: area.id, nombre: nombreSel.trim() })
      setOkMsg("Nombre actualizado.")
    } catch (e) {
      manejarError(e, "No pudimos renombrar el área. Vuelve a intentarlo.")
    }
  }

  async function reordenar(direccion: "subir" | "bajar") {
    setError(null)
    setOkMsg(null)
    try {
      await mover.mutateAsync({ id: area.id, direccion })
    } catch (e) {
      manejarError(e, "No pudimos reordenar el área. Vuelve a intentarlo.")
    }
  }

  async function aplicarActiva(activa: boolean) {
    setError(null)
    setOkMsg(null)
    setConfirmarDesactivar(false)
    try {
      await cambiarActiva.mutateAsync({ id: area.id, activa })
      setOkMsg(
        activa
          ? "Área reactivada · vuelve a exigirse a los funcionarios en proceso."
          : "Área desactivada · deja de exigirse en el cálculo del paz y salvo.",
      )
    } catch (e) {
      manejarError(e, "No pudimos cambiar el estado del área. Vuelve a intentarlo.")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Nombre
          </span>
          <input
            value={nombreSel}
            disabled={pending}
            maxLength={80}
            onChange={(e) => setNombreSel(e.target.value)}
            className={`${INPUT} min-w-[14rem]`}
          />
        </label>

        <button
          type="button"
          disabled={pending || !nombreCambio}
          onClick={() => void guardarNombre()}
          className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
        >
          {renombrar.isPending ? "Guardando…" : "Guardar nombre"}
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={pending || esPrimera}
            onClick={() => void reordenar("subir")}
            title="Subir en el orden"
            className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border transition hover:ring-gold-300 disabled:opacity-40"
          >
            ↑ Subir
          </button>
          <button
            type="button"
            disabled={pending || esUltima}
            onClick={() => void reordenar("bajar")}
            title="Bajar en el orden"
            className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border transition hover:ring-gold-300 disabled:opacity-40"
          >
            ↓ Bajar
          </button>
        </div>

        {area.activa ? (
          confirmarDesactivar ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => void aplicarActiva(false)}
                className="rounded-lg bg-estado-rechazo px-4 py-2 text-sm font-semibold text-white shadow-luxe transition hover:opacity-90 disabled:opacity-50"
              >
                Confirmar desactivar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmarDesactivar(false)}
                className="rounded-lg bg-card px-3 py-2 text-sm font-medium text-muted ring-1 ring-border transition hover:text-foreground disabled:opacity-50"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmarDesactivar(true)}
              className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-estado-rechazo ring-1 ring-estado-rechazo/30 transition hover:bg-estado-rechazoBg disabled:opacity-50"
            >
              Desactivar
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void aplicarActiva(true)}
            className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-estado-ok ring-1 ring-estado-ok/30 transition hover:bg-estado-okBg disabled:opacity-50"
          >
            Reactivar
          </button>
        )}
      </div>

      {confirmarDesactivar && (
        <p className="text-xs text-muted">
          Al desactivar, esta dependencia deja de exigirse: si era el único visto
          bueno pendiente de algún funcionario, su trámite avanzará automáticamente.
        </p>
      )}
      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
      {okMsg && <p className="text-xs text-estado-ok">{okMsg}</p>}
    </div>
  )
}
