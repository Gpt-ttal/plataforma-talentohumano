import { useState } from "react"
import type { RolUsuario } from "@pys/shared"
import { ROLES_USUARIO, ROL_LABEL } from "@pys/shared"
import { Panel } from "../../components/ui/dash/primitives"
import { Icon } from "../../components/ui/dash/Icon"
import { useAreas } from "../../hooks/useAreas"
import {
  useCrearPreaprobado,
  useEliminarPreaprobado,
  usePreaprobados,
} from "../../hooks/usePreaprobados"
import { ApiError } from "../../lib/api"

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"

/**
 * Gestión de la allowlist de acceso (solo SUPERADMIN). Pre-aprueba un correo con su
 * rol/área para que pueda crear su cuenta en el primer login, y lista/retira las
 * pre-aprobaciones vigentes. Escribe a la BD vía el backend (allowlist-as-gate).
 */
export function GestionPreaprobados() {
  const { data: preaprobados, isLoading } = usePreaprobados()
  const { data: areas } = useAreas()
  const crear = useCrearPreaprobado()
  const eliminar = useEliminarPreaprobado()

  const [email, setEmail] = useState("")
  const [rol, setRol] = useState<RolUsuario>("AREA")
  const [areaId, setAreaId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const areaNombrePorId = new Map((areas ?? []).map((a) => [a.id, a.nombre]))
  const pending = crear.isPending

  async function preaprobar() {
    setError(null)
    setOkMsg(null)
    try {
      await crear.mutateAsync({
        email,
        rol,
        areaId: rol === "AREA" ? areaId || null : null,
      })
      setOkMsg(`${email.trim().toLowerCase()} quedó autorizado.`)
      setEmail("")
      setAreaId("")
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos pre-aprobar el correo. Vuelve a intentarlo.",
      )
    }
  }

  async function quitar(correo: string) {
    setError(null)
    setOkMsg(null)
    try {
      await eliminar.mutateAsync(correo)
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos retirar el correo. Vuelve a intentarlo.",
      )
    }
  }

  return (
    <Panel icon="mail" title="Autorizar acceso">
      <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
        Solo los correos que autorices aquí pueden crear su cuenta al ingresar con
        Google. Entrarán ya con el rol y área que asignes; el resto de correos
        institucionales quedan bloqueados hasta que los agregues.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Correo institucional
          </span>
          <input
            type="email"
            value={email}
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@americana.edu.co"
            className={INPUT}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Rol
          </span>
          <select
            value={rol}
            disabled={pending}
            onChange={(e) => setRol(e.target.value as RolUsuario)}
            className={INPUT}
          >
            {ROLES_USUARIO.map((r) => (
              <option key={r} value={r}>
                {ROL_LABEL[r]}
              </option>
            ))}
          </select>
        </label>

        {rol === "AREA" && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Área
            </span>
            <select
              value={areaId}
              disabled={pending}
              onChange={(e) => setAreaId(e.target.value)}
              className={INPUT}
            >
              <option value="">— Selecciona un área —</option>
              {(areas ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          disabled={pending || email.trim() === ""}
          onClick={() => void preaprobar()}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
        >
          <Icon name="plus" className="h-4 w-4" />
          {pending ? "Autorizando…" : "Autorizar"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-estado-rechazo">{error}</p>}
      {okMsg && <p className="mt-2 text-xs text-estado-ok">{okMsg}</p>}

      <div className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Correos autorizados
        </h3>
        {isLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-surface-2" />
        ) : !preaprobados || preaprobados.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hairline bg-surface-2/60 px-4 py-3 text-xs text-muted">
            Aún no hay correos autorizados. Agrega el primero arriba.
          </p>
        ) : (
          <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-border">
            {preaprobados.map((p) => (
              <li
                key={p.email}
                className="flex items-center justify-between gap-3 bg-card px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {p.email}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {ROL_LABEL[p.rol]}
                    {p.areaId ? ` · ${areaNombrePorId.get(p.areaId) ?? "—"}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={eliminar.isPending}
                  onClick={() => void quitar(p.email)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-estado-rechazo/30 bg-estado-rechazoBg px-2.5 py-1.5 text-xs font-semibold text-estado-rechazo transition-colors hover:border-estado-rechazo/50 disabled:opacity-50"
                >
                  <Icon name="close" className="h-3.5 w-3.5" />
                  Retirar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
