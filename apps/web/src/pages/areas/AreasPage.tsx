import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { CatalogoAreas } from "./CatalogoAreas"

/**
 * Catálogo de áreas de visto bueno (solo SUPERADMIN). Crea dependencias nuevas
 * (con backfill y recálculo de estados en el backend), las renombra, reordena y
 * activa/desactiva. La gestión vive en `CatalogoAreas` (reusada en Configuración);
 * el backend autoriza y mantiene la integridad del estado global.
 */
export function AreasPage() {
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
      <CatalogoAreas />
    </div>
  )
}
