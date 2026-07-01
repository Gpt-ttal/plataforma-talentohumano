import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type Tema = "light" | "dark"

interface ThemeContextValue {
  tema: Tema
  esDark: boolean
  alternar: () => void
}

const STORAGE_KEY = "pys_theme"
const ThemeContext = createContext<ThemeContextValue | null>(null)

function temaInicial(): Tema {
  if (typeof window === "undefined") return "light"

  try {
    const guardado = window.localStorage.getItem(STORAGE_KEY)
    if (guardado === "light" || guardado === "dark") return guardado
  } catch {
    // localStorage puede fallar en contextos restringidos.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", tema === "dark")

    try {
      window.localStorage.setItem(STORAGE_KEY, tema)
    } catch {
      // La UI debe seguir funcionando aunque no pueda persistir.
    }
  }, [tema])

  const alternar = useCallback(() => {
    setTema((actual) => (actual === "dark" ? "light" : "dark"))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ tema, esDark: tema === "dark", alternar }),
    [alternar, tema],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider")
  return context
}
