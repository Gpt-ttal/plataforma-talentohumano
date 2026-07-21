import { useState } from "react"
import { CatalogoPersonal } from "./CatalogoPersonal"
import { RegistrarEmpleadoForm } from "./RegistrarEmpleadoForm"
import { HeaderMetaDot, PageHeader } from "../../components/ui/PageHeader"
import { Icon } from "../../components/ui/dash/Icon"

/**
 * Administración de Personal — maestro de empleados ("una tabla, dos proyecciones"
 * con `Funcionario`). Catálogo completo (ACTIVO/EN_RETIRO/RETIRADO), a diferencia
 * del catálogo de trámite que solo ve funcionarios con `fechaRetiro`.
 */
export function PersonalPage() {
  const [crearAbierto, setCrearAbierto] = useState(false)

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
        actions={
          <button
            type="button"
            onClick={() => setCrearAbierto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-luxe transition hover:border-gold-400"
          >
            <Icon name="plus" className="h-4 w-4" />
            Nuevo empleado
          </button>
        }
      />
      {crearAbierto && <RegistrarEmpleadoForm onClose={() => setCrearAbierto(false)} />}
      <CatalogoPersonal />
    </div>
  )
}
