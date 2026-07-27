import type { ReactNode } from "react"
import { ProveedorSecciones, useSecciones } from "./useSeccionesModal"

export type SeccionNav = { id: string; label: string }

/**
 * Andamiaje "ficha seccionada dentro de modal", fuente única para Vacantes y
 * Hoja de Vida 360°. Recibe la `identidad` (encabezado) y la lista de `secciones`
 * como slots; el header (identidad + nav de secciones) queda **pegajoso** en el
 * borde superior del contenedor de scroll del modal, y `children` son las
 * secciones. Sin lógica de dominio: solo presentación + wiring del scroll.
 */
export function DetalleModalLayout({
  identidad,
  secciones,
  children,
}: {
  identidad: ReactNode
  secciones: readonly SeccionNav[]
  children: ReactNode
}) {
  return (
    <ProveedorSecciones>
      <div className="space-y-6">
        <CabeceraFicha secciones={secciones}>{identidad}</CabeceraFicha>
        {children}
      </div>
    </ProveedorSecciones>
  )
}

/**
 * Header pegajoso full-bleed. Los márgenes negativos anulan el padding del
 * contenedor de scroll del Modal (`p-6 pt-8` / `sm:p-7 sm:pt-9`) para quedar a
 * ras del borde superior en reposo. El `sticky` usa un offset negativo igual al
 * padding-top del contenedor (`-top-8` / `sm:-top-9`) para que, al hacer scroll,
 * se ancle en el borde exterior del padding — sin la franja donde el contenido
 * asomaría con `top-0`. `pr-12` deja libre la esquina de la × del Modal.
 *
 * ACOPLE: estos offsets (`-mx-6 -mt-8` / `sm:-mx-7 sm:-mt-9`, `-top-8` / `sm:-top-9`)
 * espejan el padding del contenedor de scroll del `Modal` (`p-6 pt-8` / `sm:p-7 sm:pt-9`).
 * Si cambia el padding del Modal, ajustar aquí en el mismo commit.
 */
function CabeceraFicha({
  secciones,
  children,
}: {
  secciones: readonly SeccionNav[]
  children: ReactNode
}) {
  const { irA } = useSecciones()
  return (
    <header className="sticky -top-8 z-20 -mx-6 -mt-8 border-b border-silver-200 bg-surface pb-4 pl-6 pr-12 pt-8 dark:border-border sm:-top-9 sm:-mx-7 sm:-mt-9 sm:pl-7 sm:pt-9">
      {children}
      <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-silver-200 pt-3 dark:border-border">
        {secciones.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => irA(s.id)}
            className="flex min-h-[44px] cursor-pointer items-center rounded-full px-3 py-2 text-xs font-medium text-silver-600 transition-colors hover:bg-navy-50 hover:text-navy-700 dark:hover:bg-surface-2 dark:hover:text-foreground"
          >
            {s.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
