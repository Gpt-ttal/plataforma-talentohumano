import { useMemo, useState } from "react"
import type { NivelPermiso, RolUsuario } from "@pys/shared"
import {
  MODULOS,
  NIVELES_PERMISO,
  ROLES_USUARIO,
  ROL_LABEL,
} from "@pys/shared"
import { Panel } from "../../components/ui/dash/primitives"
import { Icon, type IconName } from "../../components/ui/dash/Icon"
import { usePermisosMatriz, useActualizarPermisosRol } from "../../hooks/usePermisos"
import { ApiError } from "../../lib/api"

const NIVEL_LABEL: Record<NivelPermiso, string> = {
  NINGUNO: "Sin acceso",
  LECTURA: "Lectura",
  ESCRITURA: "Escritura",
  ADMIN: "Administra",
}

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Matriz RBAC editable (rol × módulo). Un tab por rol; por cada módulo, un selector
 * de nivel. Guarda todas las celdas del rol de una vez. El rol SUPERADMIN se muestra
 * pero es inmutable (anti-lockout, reforzado también en el backend). La matriz solo
 * RESTA sobre el piso de `requireRol`; escribe a la BD vía backend.
 */
export function RolesPage() {
  const { data: matriz, isLoading, isError } = usePermisosMatriz()
  const guardar = useActualizarPermisosRol()

  const [rolSel, setRolSel] = useState<RolUsuario>("TALENTO_HUMANO")
  const [editado, setEditado] = useState<Record<string, NivelPermiso>>({})
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Nivel base (de la matriz) por módulo para el rol seleccionado.
  const baseDelRol = useMemo(() => {
    const map = new Map<string, NivelPermiso>()
    for (const c of matriz ?? []) {
      if (c.rol === rolSel) map.set(c.moduloId, c.nivel)
    }
    return map
  }, [matriz, rolSel])

  const esInmutable = rolSel === "SUPERADMIN"
  const nivelDe = (moduloId: string): NivelPermiso =>
    editado[moduloId] ?? baseDelRol.get(moduloId) ?? "NINGUNO"

  const hayCambios = Object.keys(editado).length > 0

  function cambiarRol(rol: RolUsuario) {
    setRolSel(rol)
    setEditado({})
    setOkMsg(null)
    setError(null)
  }

  function setNivel(moduloId: string, nivel: NivelPermiso) {
    setEditado((prev) => ({ ...prev, [moduloId]: nivel }))
    setOkMsg(null)
  }

  async function persistir() {
    setError(null)
    setOkMsg(null)
    try {
      await guardar.mutateAsync({
        rol: rolSel,
        celdas: MODULOS.map((m) => ({ moduloId: m.id, nivel: nivelDe(m.id) })),
      })
      setEditado({})
      setOkMsg(`Permisos de ${ROL_LABEL[rolSel]} guardados.`)
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos guardar los permisos. Vuelve a intentarlo.",
      )
    }
  }

  return (
    <Panel icon="lock" title="Permisos por rol y módulo">
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
        Define qué módulos ve y opera cada rol. Restringir aquí oculta el módulo en su
        menú y bloquea sus rutas en el servidor; nunca otorga más de lo que el rol ya
        permite. Los cambios surten efecto en la siguiente acción, sin re-login.
      </p>

      {/* Tabs de rol */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {ROLES_USUARIO.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => cambiarRol(r)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              rolSel === r
                ? "bg-navy text-white shadow-luxe"
                : "border border-border bg-card/75 text-muted hover:border-gold-300 hover:text-foreground"
            }`}
          >
            {ROL_LABEL[r]}
          </button>
        ))}
      </div>

      {isError ? (
        <div className="rounded-xl border border-estado-rechazo/30 bg-estado-rechazoBg px-4 py-3 text-sm text-estado-rechazo">
          No se pudo cargar la matriz de permisos. Vuelve a intentarlo.
        </div>
      ) : isLoading || !matriz ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      ) : (
        <>
          {esInmutable && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gold-300/40 bg-gold-50/60 px-3 py-2 text-xs text-foreground">
              <Icon name="shield-check" className="h-4 w-4 text-gold-600" />
              El superadministrador tiene acceso total y no puede modificarse
              (anti-bloqueo).
            </div>
          )}

          <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-border">
            {MODULOS.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 bg-card px-4 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-muted">
                    <Icon name={m.icono as IconName} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {m.nombre}
                    </span>
                    <span className="block truncate text-xs text-muted">{m.nota}</span>
                  </span>
                </span>
                <select
                  value={nivelDe(m.id)}
                  disabled={esInmutable || guardar.isPending}
                  onChange={(e) => setNivel(m.id, e.target.value as NivelPermiso)}
                  className={INPUT}
                >
                  {NIVELES_PERMISO.map((n) => (
                    <option key={n} value={n}>
                      {NIVEL_LABEL[n]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              disabled={esInmutable || !hayCambios || guardar.isPending}
              onClick={() => void persistir()}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
            >
              <Icon name="check" className="h-4 w-4" />
              {guardar.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
            {okMsg && <span className="text-xs text-estado-ok">{okMsg}</span>}
            {error && <span className="text-xs text-estado-rechazo">{error}</span>}
          </div>
        </>
      )}
    </Panel>
  )
}
