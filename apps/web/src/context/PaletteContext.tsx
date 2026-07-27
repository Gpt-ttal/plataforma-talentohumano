import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/**
 * Paletas de acento (andamiaje "para cuando integremos nuevas marcas"). Intercambia
 * SOLO las variables CSS de acento ambiental —oro y navy— que alimentan destellos,
 * bordes y superficies var-driven de `index.css`. NO toca el semáforo de estados
 * (`estado-*`): la Regla del Semáforo Único es intocable. Persiste en localStorage.
 *
 * Nota honesta: las escalas Tailwind `gold-*`/`navy-*` son fijas; el cambio de
 * paleta ajusta el acento ambiental, no recolorea cada utilidad. Es la base para
 * integrar paletas completas más adelante sin romper la marca vigente.
 */
export interface Paleta {
  id: string
  nombre: string
  descripcion: string
  /** Valores de las variables CSS de acento. `*Rgb` en formato "R G B". */
  vars: { gold: string; goldRgb: string; navy: string; navyRgb: string }
}

export const PALETAS: Paleta[] = [
  {
    id: "institucional",
    nombre: "Institucional",
    descripcion: "Navy + oro antiguo — la marca vigente.",
    vars: { gold: "#B68D40", goldRgb: "182 141 64", navy: "#142943", navyRgb: "20 41 67" },
  },
  {
    id: "bronce-profundo",
    nombre: "Bronce profundo",
    descripcion: "Acento bronce cálido sobre un navy más oscuro.",
    vars: { gold: "#A9762F", goldRgb: "169 118 47", navy: "#122234", navyRgb: "18 34 52" },
  },
]

const PALETA_DEFECTO = PALETAS[0]!
const STORAGE_KEY = "pys_palette"

interface PaletteContextValue {
  paleta: Paleta
  paletas: Paleta[]
  seleccionar: (id: string) => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

function paletaInicial(): Paleta {
  if (typeof window === "undefined") return PALETA_DEFECTO
  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY)
    return PALETAS.find((p) => p.id === guardado) ?? PALETA_DEFECTO
  } catch {
    return PALETA_DEFECTO
  }
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [paleta, setPaleta] = useState<Paleta>(paletaInicial)

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--gold", paleta.vars.gold)
    root.style.setProperty("--gold-rgb", paleta.vars.goldRgb)
    root.style.setProperty("--navy", paleta.vars.navy)
    root.style.setProperty("--navy-rgb", paleta.vars.navyRgb)
    try {
      window.localStorage.setItem(STORAGE_KEY, paleta.id)
    } catch {
      // La UI sigue funcionando aunque no pueda persistir.
    }
  }, [paleta])

  const seleccionar = useCallback((id: string) => {
    const elegida = PALETAS.find((p) => p.id === id)
    if (elegida) setPaleta(elegida)
  }, [])

  const value = useMemo<PaletteContextValue>(
    () => ({ paleta, paletas: PALETAS, seleccionar }),
    [paleta, seleccionar],
  )

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}

export function usePalette() {
  const ctx = useContext(PaletteContext)
  if (!ctx) throw new Error("usePalette debe usarse dentro de PaletteProvider")
  return ctx
}
