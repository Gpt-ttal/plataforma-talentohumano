import { Link } from "react-router-dom"
import { modulosParaRol, rutaOficinaPorRol } from "@pys/shared"
import type { Modulo, RolUsuario } from "@pys/shared"
import { Icon } from "../../components/ui/dash/Icon"
import type { IconName } from "../../components/ui/dash/Icon"
import { useModulosVisibles } from "../../hooks/usePermisos"

/**
 * Lanzador de módulos compacto del Panel. Conserva la visión de "App madre"
 * (módulos activos + módulos futuros honestos) en una franja densa, sin robar
 * protagonismo al dashboard que va debajo. La lista de módulos y quién los ve es
 * declarativa (`modulosParaRol` en `@pys/shared`); aquí no se hardcodea ninguno.
 */

/** Destino del módulo. Paz y Salvo es role-aware (cada rol cae en su oficina). */
function destinoModulo(mod: Modulo, rol: RolUsuario): string {
  return mod.id === "paz-y-salvo" ? rutaOficinaPorRol(rol) : mod.rutaBase
}

function ModuloActivo({ href, titulo, nota, icono }: {
  href: string
  titulo: string
  nota: string
  icono: IconName
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card/92 p-3.5 shadow-luxe ring-1 ring-gold-200/50 transition duration-150 hover:border-gold-300 hover:shadow-gold"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-deep text-white shadow-luxe ring-1 ring-gold/30">
        <Icon name={icono} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{titulo}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-estado-okBg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-estado-ok ring-1 ring-estado-ok/25">
            <span className="h-1 w-1 rounded-full bg-estado-ok" />
            Activo
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">{nota}</span>
      </span>
      <Icon
        name="arrow"
        className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-gold-600"
      />
    </Link>
  )
}

function ModuloProximamente({ titulo, icono }: { titulo: string; icono: IconName }) {
  return (
    <div
      aria-disabled
      className="flex items-center gap-3 rounded-xl border border-dashed border-hairline bg-surface-2/60 p-3.5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-faint">
        <Icon name={icono} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="truncate text-sm font-semibold text-muted">{titulo}</span>
        <span className="mt-0.5 block text-xs text-muted">Próximamente</span>
      </span>
    </div>
  )
}

export function ModuleLauncher({ rol }: { rol: RolUsuario }) {
  // La matriz RBAC solo FILTRA lo que el rol ya vería; `null` (cargando/fallo) = todo.
  const visibles = useModulosVisibles()
  const modulos = modulosParaRol(rol).filter(
    (m) => !visibles || visibles.has(m.id),
  )
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modulos.map((mod) =>
        mod.estado === "ACTIVO" ? (
          <ModuloActivo
            key={mod.id}
            href={destinoModulo(mod, rol)}
            titulo={mod.nombre}
            nota={mod.nota}
            icono={mod.icono as IconName}
          />
        ) : (
          <ModuloProximamente
            key={mod.id}
            titulo={mod.nombre}
            icono={mod.icono as IconName}
          />
        ),
      )}
    </section>
  )
}
