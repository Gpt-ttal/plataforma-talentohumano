import { useTheme } from "../context/ThemeContext"

type ThemeToggleVariant = "sidebar" | "header"

function SunIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12.8A8.6 8.6 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

const base =
  "inline-flex shrink-0 items-center justify-center transition duration-200 motion-reduce:transition-none"

const variants: Record<ThemeToggleVariant, string> = {
  sidebar:
    "h-7 w-7 rounded-md text-[#c6cfdd] hover:bg-white/[0.08] hover:text-white focus-visible:rounded-md",
  header:
    "h-9 w-9 rounded-lg border border-border bg-card/82 text-muted shadow-sm hover:border-gold-300 hover:text-foreground focus-visible:rounded-lg",
}

export function ThemeToggle({ variant = "header" }: { variant?: ThemeToggleVariant }) {
  const { esDark, alternar } = useTheme()

  return (
    <button
      type="button"
      aria-label={esDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={esDark}
      title={esDark ? "Modo claro" : "Modo oscuro"}
      onClick={alternar}
      className={`${base} ${variants[variant]}`}
    >
      <span className="grid transition-transform duration-200 motion-reduce:transition-none motion-reduce:transform-none">
        {esDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  )
}
