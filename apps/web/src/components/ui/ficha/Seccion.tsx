import type { ReactNode } from "react"
import { Icon } from "../dash/Icon"
import type { IconName } from "../dash/Icon"
import { useRegistroSeccion } from "./useSeccionesModal"

/**
 * Contenedor de una sección de ficha dentro del modal. Se auto-registra en el
 * proveedor de secciones (para que la nav pegajosa la encuentre) y conserva el
 * `scroll-mt-*` que compensa el offset del header pegajoso al hacer scroll.
 */
export function Seccion({
  id,
  titulo,
  icono,
  children,
}: {
  id: string
  titulo: string
  icono: IconName
  children: ReactNode
}) {
  const ref = useRegistroSeccion(id)
  return (
    <section ref={ref} id={id} className="premium-card scroll-mt-40 rounded-2xl px-5 py-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-navy-800 dark:text-foreground">
        <Icon name={icono} className="h-4 w-4 text-gold-500" />
        {titulo}
      </h2>
      {children}
    </section>
  )
}
