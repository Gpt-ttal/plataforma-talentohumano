import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ROL_LABEL, rutaInicialPorRol } from "@pys/shared"
import type { RolUsuario } from "@pys/shared"
import { useAuth } from "../../context/AuthContext"
import { useAreas } from "../../hooks/useAreas"

/**
 * RoleSwitcher — herramienta de desarrollo (solo SUPERADMIN). Permite "ponerse en
 * los zapatos" de cada rol para experimentar su UI/UX sin tocar la cuenta real:
 * reescribe el `usuario` efectivo del `AuthContext` mientras el JWT sigue siendo el
 * del superadmin (el backend autoriza todo). La identidad real queda guardada y se
 * recupera con "Volver a Admin".
 *
 * No es una guarda de seguridad: las acciones que se ejecuten impersonando golpean
 * la BD real como SUPERADMIN. Es un banco de pruebas de experiencia, no un sandbox.
 */

/** Roles que tiene sentido impersonar (el superadmin es el punto de partida). */
const ROLES_IMPERSONABLES: RolUsuario[] = [
  "TALENTO_HUMANO",
  "CONTROL_INTERNO",
  "AREA",
  "SST",
]

export function RoleSwitcher() {
  const { usuarioReal, impersonacion, impersonar, detenerImpersonacion } = useAuth()
  const { data: areas } = useAreas()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [eligiendoArea, setEligiendoArea] = useState(false)

  // Solo el superadmin real ve esta herramienta.
  if (usuarioReal?.rol !== "SUPERADMIN") return null

  const impersonando = impersonacion !== null

  function activarRol(rol: RolUsuario, areaId: string | null = null) {
    impersonar(rol, areaId)
    setAbierto(false)
    setEligiendoArea(false)
    navigate(rutaInicialPorRol(rol, "ACTIVO"))
  }

  function volverAAdmin() {
    detenerImpersonacion()
    setAbierto(false)
    setEligiendoArea(false)
    navigate(rutaInicialPorRol("SUPERADMIN", "ACTIVO"))
  }

  const areaActiva =
    impersonacion?.rol === "AREA"
      ? areas?.find((a) => a.id === impersonacion.areaId)
      : undefined

  const etiquetaActual = impersonacion
    ? impersonacion.rol === "AREA"
      ? `${ROL_LABEL.AREA} · ${areaActiva?.nombre ?? "—"}`
      : ROL_LABEL[impersonacion.rol]
    : ROL_LABEL.SUPERADMIN

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 print:hidden">
      {abierto && (
        <div className="w-72 overflow-hidden rounded-2xl border border-gold-300/20 bg-[#0b1324] text-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#d8c38d]">
              Modo desarrollador
            </p>
            <p className="mt-0.5 text-[13px] font-semibold text-white">
              Experimentar como rol
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[#aeb9cc]">
              Tu sesión real (Admin) queda guardada. Las acciones impactan datos reales.
            </p>
          </div>

          {!eligiendoArea ? (
            <div className="flex flex-col gap-1 p-2">
              {ROLES_IMPERSONABLES.map((rol) => {
                const activo =
                  impersonacion?.rol === rol && rol !== "AREA"
                if (rol === "AREA") {
                  return (
                    <button
                      key={rol}
                      type="button"
                      onClick={() => setEligiendoArea(true)}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-[#d7dfef] transition hover:bg-white/[0.09] hover:text-white"
                    >
                      <span>{ROL_LABEL.AREA}</span>
                      <span aria-hidden className="text-[#aeb9cc]">
                        elegir área →
                      </span>
                    </button>
                  )
                }
                return (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => activarRol(rol)}
                    className={`rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition ${
                      activo
                        ? "bg-gold-400/15 text-white ring-1 ring-gold-300/35"
                        : "text-[#d7dfef] hover:bg-white/[0.09] hover:text-white"
                    }`}
                  >
                    {ROL_LABEL[rol]}
                  </button>
                )
              })}

              <div className="my-1 h-px bg-white/10" />

              <button
                type="button"
                onClick={volverAAdmin}
                disabled={!impersonando}
                className="rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-emerald-200 transition enabled:hover:bg-white/[0.09] enabled:hover:text-emerald-100 disabled:opacity-40"
              >
                ← Volver a Admin
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              <button
                type="button"
                onClick={() => setEligiendoArea(false)}
                className="mb-1 rounded-lg px-3 py-1.5 text-left text-[11px] font-semibold text-[#aeb9cc] transition hover:text-white"
              >
                ← Roles
              </button>
              <div className="max-h-64 overflow-y-auto">
                {!areas ? (
                  <p className="px-3 py-2 text-[12px] text-[#aeb9cc]">Cargando áreas…</p>
                ) : areas.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-[#aeb9cc]">No hay áreas.</p>
                ) : (
                  areas.map((a) => {
                    const activo =
                      impersonacion?.rol === "AREA" && impersonacion.areaId === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => activarRol("AREA", a.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition ${
                          activo
                            ? "bg-gold-400/15 text-white ring-1 ring-gold-300/35"
                            : "text-[#d7dfef] hover:bg-white/[0.09] hover:text-white"
                        }`}
                      >
                        <span className="truncate">{a.nombre}</span>
                        <span className="ml-2 shrink-0 font-mono text-[10px] text-[#aeb9cc]">
                          #{a.orden}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)] transition ${
          impersonando
            ? "border-gold-300/40 bg-gold-400/15 text-white ring-1 ring-gold-300/30 backdrop-blur"
            : "border-gold-300/20 bg-[#0b1324] text-[#d7dfef] hover:text-white"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            impersonando
              ? "bg-gold-300 shadow-[0_0_8px_rgba(218,181,94,0.8)]"
              : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
          }`}
        />
        <span className="max-w-[180px] truncate">{etiquetaActual}</span>
      </button>
    </div>
  )
}
