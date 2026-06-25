import { useState } from "react"
import type { EstadoUsuario, RolUsuario } from "@pys/shared"
import { ROLES_USUARIO, ROL_LABEL } from "@pys/shared"
import { useAsignarRol, useCambiarEstadoUsuario } from "../../hooks/useUsuarios"
import { ApiError } from "../../lib/api"

interface OpcionArea {
  id: string
  nombre: string
}

const INPUT =
  "rounded-lg border border-silver-300 bg-white px-3 py-2 text-sm text-navy-800 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Asignación de rol/área y (des)activación de un usuario. El backend valida el
 * invariante AREA↔área (400 si falta) y la autorización (solo SA); aquí solo se
 * refleja el resultado. Las mutaciones invalidan la lista de usuarios.
 */
export function GestionUsuario({
  usuarioId,
  rol,
  areaId,
  estado,
  areas,
}: {
  usuarioId: string
  rol: RolUsuario
  areaId: string | null
  estado: EstadoUsuario
  areas: OpcionArea[]
}) {
  const asignar = useAsignarRol()
  const cambiar = useCambiarEstadoUsuario()
  const [rolSel, setRolSel] = useState<RolUsuario>(rol)
  const [areaSel, setAreaSel] = useState<string>(areaId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const pending = asignar.isPending || cambiar.isPending

  async function guardar() {
    setError(null)
    setOkMsg(null)
    try {
      await asignar.mutateAsync({
        usuarioId,
        rol: rolSel,
        areaId: rolSel === "AREA" ? areaSel || null : null,
      })
      setOkMsg("Asignación guardada · usuario activo.")
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos guardar la asignación. Vuelve a intentarlo.",
      )
    }
  }

  async function cambiarEstado(nuevo: EstadoUsuario) {
    setError(null)
    setOkMsg(null)
    try {
      await cambiar.mutateAsync({ usuarioId, estado: nuevo })
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos cambiar el estado del usuario. Vuelve a intentarlo.",
      )
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
            Rol
          </span>
          <select
            value={rolSel}
            disabled={pending}
            onChange={(e) => setRolSel(e.target.value as RolUsuario)}
            className={INPUT}
          >
            {ROLES_USUARIO.map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </select>
        </label>

        {rolSel === "AREA" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-silver-600">
              Área
            </span>
            <select
              value={areaSel}
              disabled={pending}
              onChange={(e) => setAreaSel(e.target.value)}
              className={INPUT}
            >
              <option value="">— Selecciona un área —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => void guardar()}
          className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar asignación"}
        </button>

        {estado === "ACTIVO" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void cambiarEstado("INACTIVO")}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-estado-rechazo ring-1 ring-estado-rechazo/30 transition hover:bg-red-50 disabled:opacity-50"
          >
            Inactivar
          </button>
        )}
        {estado === "INACTIVO" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void cambiarEstado("ACTIVO")}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-estado-ok ring-1 ring-estado-ok/30 transition hover:bg-estado-okBg disabled:opacity-50"
          >
            Reactivar
          </button>
        )}
      </div>

      {error && <p className="text-xs text-estado-rechazo">{error}</p>}
      {okMsg && <p className="text-xs text-estado-ok">{okMsg}</p>}
    </div>
  )
}
