import { CatalogoAreas } from "../areas/CatalogoAreas"

/**
 * Sub-página Catálogos de Configuración (solo SUPERADMIN). Hoy gestiona el catálogo
 * de áreas de visto bueno (reusado de `/areas`). Es el punto de extensión para otros
 * catálogos (p. ej. áreas de Vacantes) sin salir de la Configuración. El shell ya
 * provee el encabezado; aquí solo van las superficies.
 */
export function CatalogosPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Áreas de visto bueno
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Dependencias que aprueban el paz y salvo. Crear, renombrar, reordenar y
            activar o desactivar. Una dependencia inactiva deja de exigirse.
          </p>
        </div>
        <CatalogoAreas />
      </section>
    </div>
  )
}
