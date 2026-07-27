import { Panel } from "../../components/ui/dash/primitives"
import { Icon } from "../../components/ui/dash/Icon"
import { useTheme } from "../../context/ThemeContext"
import { usePalette } from "../../context/PaletteContext"

/**
 * Apariencia — tema claro/oscuro (conectado a `ThemeContext`) y selector de paleta
 * de acento (conectado a `PaletteContext`). Ambas preferencias persisten en
 * `localStorage`. El semáforo de estados nunca cambia (Regla del Semáforo Único).
 */
export function AparienciaPage() {
  const { tema, esDark, alternar } = useTheme()
  const { paleta, paletas, seleccionar } = usePalette()

  return (
    <div className="space-y-6">
      <Panel icon="eye" title="Tema">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Modo {esDark ? "oscuro" : "claro"}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted">
              Se aplica de inmediato y se recuerda en este navegador. Respeta la
              preferencia del sistema en el primer ingreso.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => esDark && alternar()}
              aria-pressed={tema === "light"}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${
                tema === "light"
                  ? "border-gold-300 bg-card text-foreground shadow-luxe"
                  : "border-border bg-card/75 text-muted hover:border-gold-300 hover:text-foreground"
              }`}
            >
              <Icon name="eye" className="h-3.5 w-3.5" />
              Claro
            </button>
            <button
              type="button"
              onClick={() => !esDark && alternar()}
              aria-pressed={tema === "dark"}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition-colors ${
                tema === "dark"
                  ? "border-gold-300 bg-card text-foreground shadow-luxe"
                  : "border-border bg-card/75 text-muted hover:border-gold-300 hover:text-foreground"
              }`}
            >
              <Icon name="lock" className="h-3.5 w-3.5" />
              Oscuro
            </button>
          </div>
        </div>
      </Panel>

      <Panel icon="grid" title="Paleta de acento">
        <p className="mb-4 max-w-2xl text-sm leading-6 text-muted">
          Ajusta el acento ambiental de la interfaz (oro y navy). El semáforo de
          estados no cambia. Es la base para integrar paletas completas de nuevas
          marcas más adelante.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {paletas.map((p) => {
            const activa = p.id === paleta.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => seleccionar(p.id)}
                aria-pressed={activa}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                  activa
                    ? "border-gold-300 bg-card shadow-luxe"
                    : "border-border bg-surface hover:border-gold-300"
                }`}
              >
                <span className="flex shrink-0 gap-1">
                  <span
                    className="h-8 w-4 rounded-l-md"
                    style={{ backgroundColor: p.vars.navy }}
                  />
                  <span
                    className="h-8 w-4 rounded-r-md"
                    style={{ backgroundColor: p.vars.gold }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {p.nombre}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {p.descripcion}
                  </span>
                </span>
                {activa && (
                  <Icon name="check" className="h-4 w-4 shrink-0 text-gold-600" />
                )}
              </button>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
