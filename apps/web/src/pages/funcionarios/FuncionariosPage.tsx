import { CatalogoFuncionarios } from "./CatalogoFuncionarios"

/**
 * Catálogo de supervisión del superadmin (vista "todos"). TH y CI tienen sus
 * propias oficinas (`TalentoHumanoPage` / `ControlInternoPage`); esta página queda
 * acotada a SUPERADMIN por la guarda de ruta.
 */
export function FuncionariosPage() {
  return <CatalogoFuncionarios vista="todos" basePath="/paz-y-salvo/funcionarios" />
}
