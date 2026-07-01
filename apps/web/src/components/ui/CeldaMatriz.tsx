import type { EstadoArea } from "@pys/shared"
import { ESTADO_AREA_CELDA, ESTADO_AREA_LABEL } from "@pys/shared"

/**
 * Celda compacta de la matriz funcionario × área: símbolo + color por estado
 * (Semáforo Único, desde `@pys/shared`). Un área sin fila para el funcionario se
 * muestra neutra. La etiqueta va en `title` + texto para lectores de pantalla.
 */
export function CeldaMatriz({ estado }: { estado: EstadoArea | undefined }) {
  if (!estado) {
    return (
      <span className="text-faint" title="Sin dato">
        <span className="sr-only">Sin dato</span>
        <span aria-hidden>·</span>
      </span>
    )
  }
  const { simbolo, className } = ESTADO_AREA_CELDA[estado]
  const label = ESTADO_AREA_LABEL[estado]
  return (
    <span className={`text-sm font-semibold tabular-nums ${className}`} title={label}>
      <span className="sr-only">{label}</span>
      <span aria-hidden>{simbolo}</span>
    </span>
  )
}
