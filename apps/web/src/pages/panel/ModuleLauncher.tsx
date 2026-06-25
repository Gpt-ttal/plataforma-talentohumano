import { Link } from "react-router-dom"
import { Icon } from "../../components/ui/dash/Icon"

/**
 * Lanzador de módulos compacto del Panel. Conserva la visión de "App madre"
 * (Paz y Salvo activo + módulos futuros honestos) en una franja densa, sin robar
 * protagonismo al dashboard que va debajo.
 */

function ModuloActivo({
  href,
  titulo,
  nota,
}: {
  href: string
  titulo: string
  nota: string
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl border border-silver-200 bg-white/92 p-3.5 shadow-luxe ring-1 ring-gold-200/50 transition duration-150 hover:border-gold-300 hover:shadow-gold"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-deep text-white shadow-luxe ring-1 ring-gold/30">
        <Icon name="check" className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-navy-900">{titulo}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-estado-okBg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-estado-ok ring-1 ring-estado-ok/25">
            <span className="h-1 w-1 rounded-full bg-estado-ok" />
            Activo
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-silver-600">{nota}</span>
      </span>
      <Icon
        name="arrow"
        className="h-4 w-4 shrink-0 text-silver-400 transition-colors group-hover:text-gold-600"
      />
    </Link>
  )
}

function ModuloProximamente({ titulo }: { titulo: string }) {
  return (
    <div
      aria-disabled
      className="flex items-center gap-3 rounded-xl border border-dashed border-silver-300 bg-silver-50/60 p-3.5"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-silver-200 bg-white text-silver-400">
        <Icon name="lock" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="truncate text-sm font-semibold text-silver-600">{titulo}</span>
        <span className="mt-0.5 block text-xs text-silver-600">Próximamente</span>
      </span>
    </div>
  )
}

export function ModuleLauncher({
  esSuperadmin,
  oficina,
}: {
  esSuperadmin: boolean
  /** Ruta de la oficina del rol actual (`rutaOficinaPorRol`); evita mandar a TH a /no-access. */
  oficina: string
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <ModuloActivo
        href={oficina}
        titulo="Paz y Salvo"
        nota={esSuperadmin ? "Catálogo y trámite de retiro" : "Tu bandeja de liquidaciones"}
      />
      <ModuloProximamente titulo="Contratación" />
      <ModuloProximamente titulo="Bienestar" />
    </section>
  )
}
