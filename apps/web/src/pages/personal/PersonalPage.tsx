import { CatalogoPersonal } from "./CatalogoPersonal"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"

/**
 * Administración de Personal — maestro de empleados ("una tabla, dos proyecciones"
 * con `Funcionario`). Catálogo completo (ACTIVO/EN_RETIRO/RETIRADO), a diferencia
 * del catálogo de trámite que solo ve funcionarios con `fechaRetiro`.
 */
export function PersonalPage() {
  return (
    <div className="space-y-7">
      <PageHeader
        title="Administración de Personal"
        description="Maestro de empleados de la institución: identidad, vinculación y contacto. Registra el ingreso, actualiza datos y finaliza el contrato para disparar el trámite de Paz y Salvo."
        meta={
          <>
            <span>Gestión Humana</span>
            <span className="hidden text-silver-300 sm:inline">/</span>
            <HeaderMetaDot tone="gold">Maestro de empleados</HeaderMetaDot>
          </>
        }
      />
      <CatalogoPersonal />
    </div>
  )
}
