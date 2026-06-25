import { CatalogoFuncionarios } from "./CatalogoFuncionarios"

/**
 * Oficina de Talento Humano (vista "th"): foco en generar la liquidación de los
 * colaboradores listos. Ve todo el pipeline, pero su única acción es Generar
 * liquidación. Acotada a TALENTO_HUMANO y SUPERADMIN por la guarda de ruta.
 */
export function TalentoHumanoPage() {
  return <CatalogoFuncionarios vista="th" basePath="/paz-y-salvo/talento-humano" />
}
