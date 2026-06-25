/**
 * Formateadores y saludo del Panel de control. Extraídos de InicioPage/Dashboard
 * (eran idénticos en ambas) para una sola fuente de verdad. es-CO, zona Bogotá.
 */

/** Número con separadores es-CO (miles). */
export function fmt(n: number): string {
  return n.toLocaleString("es-CO")
}

/** Porcentaje entero de `part` sobre `total` (0% si total ≤ 0). */
export function pct(part: number, total: number): string {
  if (total <= 0) return "0%"
  return `${Math.round((part / total) * 100)}%`
}

/** Máximo de una lista, mínimo 1 (para escalar barras sin dividir por 0). */
export function maxValue(values: number[]): number {
  return Math.max(1, ...values)
}

/** Fecha larga es-CO en zona horaria de Bogotá (p. ej. "lunes, 24 de junio de 2026"). */
export function formatDate(): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date())
}

/** Saludo según la hora local de Bogotá. */
export function getGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("es-CO", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Bogota",
    }).format(new Date()),
  )
  if (hour < 12) return "Buenos días"
  if (hour < 18) return "Buenas tardes"
  return "Buenas noches"
}
