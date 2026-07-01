import { useState } from "react"
import { useAreasAdmin, useCrearArea } from "../../hooks/useAreas"
import { FilaDesplegable } from "../../components/ui/FilaDesplegable"
import { ListaSkeleton } from "../../components/ui/ListaSkeleton"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { AreaIcon } from "../../components/ui/AreaIcon"
import { ApiError } from "../../lib/api"
import { GestionArea } from "./GestionArea"

/**
 * Catálogo de áreas de visto bueno (solo SUPERADMIN). Crea dependencias nuevas
 * (con backfill y recálculo de estados en el backend), las renombra, reordena y
 * activa/desactiva. Datos vía `useAreasAdmin` (incluye inactivas); el backend
 * autoriza y mantiene la integridad del estado global.
 */
export function AreasPage() {
  const { data: areas, isLoading, isError } = useAreasAdmin()
  const crear = useCrearArea()

  const [nombre, setNombre] = useState("")
  const [error, setError] = useState<string | null>(null)

  const nombreValido = nombre.trim().length >= 2

  async function crearArea() {
    setError(null)
    try {
      await crear.mutateAsync(nombre.trim())
      setNombre("")
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No pudimos crear el área. Vuelve a intentarlo.",
      )
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Catálogo de áreas"
        description="Administra las dependencias que dan visto bueno: crea, renombra, reordena y activa o desactiva. Una dependencia inactiva deja de exigirse en el cálculo del paz y salvo."
        meta={
          <>
            <span>Configuración del trámite</span>
            <span className="hidden text-faint sm:inline">/</span>
            <HeaderMetaDot tone="gold">Dependencias de visto bueno</HeaderMetaDot>
          </>
        }
      />

      {/* Crear dependencia nueva */}
      <div className="premium-card space-y-3 rounded-xl px-4 py-4">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Nueva dependencia
        </span>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Nombre
            </span>
            <input
              value={nombre}
              disabled={crear.isPending}
              maxLength={80}
              placeholder="p. ej. Bienestar Universitario"
              onChange={(e) => setNombre(e.target.value)}
              className="min-w-[16rem] rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400 disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            disabled={crear.isPending || !nombreValido}
            onClick={() => void crearArea()}
            className="rounded-lg bg-navy-deep px-4 py-2 text-sm font-semibold text-white shadow-luxe ring-1 ring-gold/40 transition hover:shadow-gold disabled:opacity-50"
          >
            {crear.isPending ? "Creando…" : "Crear área"}
          </button>
        </div>
        <p className="text-xs text-muted">
          La dependencia nueva entra como pendiente para los trámites en proceso; los
          ya cerrados no se reabren.
        </p>
        {error && <p className="text-xs text-estado-rechazo">{error}</p>}
      </div>

      {isError ? (
        <div className="rounded-xl border border-estado-rechazo/30 bg-estado-rechazoBg px-4 py-3 text-sm text-estado-rechazo">
          No se pudo cargar el catálogo de áreas. Vuelve a intentarlo.
        </div>
      ) : isLoading || !areas ? (
        <ListaSkeleton filas={6} />
      ) : (
        <div className="space-y-2.5">
          {areas.map((area, indice) => (
            <FilaDesplegable
              key={area.id}
              cabecera={
                <span className="flex min-w-0 items-center gap-3">
                  <AreaIcon nombre={area.nombre} variant="disc" size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">
                      {area.nombre}
                    </span>
                    <span className="block text-xs text-muted">
                      Orden {area.orden} en el flujo de visto bueno
                    </span>
                  </span>
                  <span
                    className={
                      area.activa
                        ? "inline-flex items-center gap-1.5 rounded-full bg-estado-okBg px-2.5 py-1 text-xs font-semibold text-estado-ok"
                        : "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted"
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        area.activa ? "bg-estado-ok" : "bg-faint"
                      }`}
                    />
                    {area.activa ? "Activa" : "Inactiva"}
                  </span>
                </span>
              }
            >
              <GestionArea
                area={area}
                esPrimera={indice === 0}
                esUltima={indice === areas.length - 1}
              />
            </FilaDesplegable>
          ))}
        </div>
      )}
    </div>
  )
}
