import * as XLSX from "xlsx"
import type {
  ErrorParseoFila,
  FilaCruda,
} from "../../domain/ports/LoteImportacionRepo.js"

export interface ResultadoParseo {
  filas: FilaCruda[]
  errores: ErrorParseoFila[]
}

function normalizarClave(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim()
    .toLowerCase()
}

function buscarValor(fila: Record<string, unknown>, alias: string[]): unknown {
  const claves = Object.keys(fila)
  for (const nombre of alias) {
    const clave = claves.find((k) => normalizarClave(k) === nombre)
    if (clave !== undefined) return fila[clave]
  }
  return undefined
}

function aFechaIso(valor: unknown): string | null {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10)
  }
  if (typeof valor === "string" && valor.trim()) {
    const d = new Date(valor.trim())
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  return null
}

/**
 * Parsea la primera hoja de un Excel de desvinculaciones masivas. Columnas
 * esperadas (encabezados case/acento-insensibles): Documento, Nombre Completo,
 * Fecha Retiro, Cargo (opcional). Filas sin documento, sin nombre o sin fecha
 * reconocible NO se descartan en silencio: quedan en `errores` para que la
 * previsualización las muestre — no llegan a validarse contra la BD.
 */
export function parsearArchivoDesvinculaciones(buffer: Buffer): ResultadoParseo {
  const libro = XLSX.read(buffer, { type: "buffer", cellDates: true })
  const nombreHoja = libro.SheetNames[0]
  const hoja = nombreHoja ? libro.Sheets[nombreHoja] : undefined
  if (!hoja) return { filas: [], errores: [] }

  const filasCrudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: "",
  })

  const filas: FilaCruda[] = []
  const errores: ErrorParseoFila[] = []

  filasCrudas.forEach((fila, i) => {
    const numeroFila = i + 2 // fila 1 = encabezados
    const documento = String(
      buscarValor(fila, ["documento", "cedula", "cc"]) ?? "",
    ).trim()
    const nombreCompleto = String(
      buscarValor(fila, ["nombre completo", "nombre", "nombrecompleto"]) ?? "",
    ).trim()
    const cargoRaw = buscarValor(fila, ["cargo"])
    const cargo = cargoRaw ? String(cargoRaw).trim() || null : null
    const fechaRetiro = aFechaIso(
      buscarValor(fila, ["fecha retiro", "fecha de retiro", "fecharetiro"]),
    )

    if (!documento) {
      errores.push({ numeroFila, motivo: "Fila sin documento." })
      return
    }
    if (!nombreCompleto) {
      errores.push({ numeroFila, motivo: "Fila sin nombre completo." })
      return
    }
    if (!fechaRetiro) {
      errores.push({ numeroFila, motivo: "Fecha de retiro no reconocida." })
      return
    }

    filas.push({ numeroFila, documento, nombreCompleto, fechaRetiro, cargo })
  })

  return { filas, errores }
}
