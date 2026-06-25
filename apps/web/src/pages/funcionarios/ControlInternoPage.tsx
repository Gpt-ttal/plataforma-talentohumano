import { CatalogoFuncionarios } from "./CatalogoFuncionarios"

/**
 * Oficina de Control Interno (vista "ci"): es quien FINALIZA el trámite registrando
 * el paz y salvo (estado terminal). Ve todo el pipeline para auditar, pero su única
 * acción es registrar el cierre. Acotada a CONTROL_INTERNO y SUPERADMIN por la guarda.
 */
export function ControlInternoPage() {
  return <CatalogoFuncionarios vista="ci" basePath="/paz-y-salvo/control-interno" />
}
