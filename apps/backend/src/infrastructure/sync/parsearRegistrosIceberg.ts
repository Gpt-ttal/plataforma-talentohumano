import type {
  EstadoCivil,
  Genero,
  RegistroIcebergCrudo,
  TipoContrato,
  TipoDocumento,
  TipoVinculacion,
} from "@pys/shared"
import type {
  ErrorParseoFila,
  RegistroSyncNormalizado,
} from "../../domain/ports/SyncPersonalRepo.js"

/**
 * Capa anticorrupción (ACL) del sync de Iceberg: normaliza los registros CRUDOS
 * (strings/enums en la grafía externa) a nuestras columnas TIPADAS. Es PURA (sin
 * I/O) y standalone: convierte fechas a ISO, enums a nuestras uniones, y números
 * a `number`. Un valor que no se puede mapear queda `null` (best-effort, no
 * aborta la fila); solo se descarta a `errores` el registro sin documento/nombre.
 */
export interface ResultadoParseoSync {
  filas: RegistroSyncNormalizado[]
  errores: ErrorParseoFila[]
}

/** NFD sin acentos, minúsculas, recortado — para comparar contra tablas de alias. */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .trim()
    .toLowerCase()
}

/** Valor crudo → string recortado, o `null` si vacío/ausente. */
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === "" ? null : s
}

/** Valor crudo → fecha ISO (yyyy-mm-dd), o `null`. Acepta ISO y dd/mm/yyyy. */
function aFechaIso(v: unknown): string | null {
  const s = str(v)
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s)
  if (dmy) {
    const dd = (dmy[1] ?? "").padStart(2, "0")
    const mm = (dmy[2] ?? "").padStart(2, "0")
    const y = dmy[3] ?? ""
    return `${y}-${mm}-${dd}`
  }
  const parsed = new Date(s)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

/**
 * Valor crudo → número, o `null`. Tolera símbolos y ambos formatos de separador:
 * cuando conviven `.` y `,`, el ÚLTIMO es el decimal (así "1.234.567,89" → 1234567.89);
 * con un solo tipo de separador, se trata como decimal solo si va seguido de 1–2
 * dígitos ("2500000,50" → 2500000.5), y como separador de miles en otro caso
 * ("2.500.000" → 2500000), que es lo usual para salarios en COP.
 */
function aNumero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const s = str(v)
  if (!s) return null
  let limpio = s.replace(new RegExp("[^0-9.,-]", "g"), "")
  if (limpio === "" || limpio === "-") return null
  const tienePunto = limpio.includes(".")
  const tieneComa = limpio.includes(",")
  if (tienePunto && tieneComa) {
    const decSep = limpio.lastIndexOf(".") > limpio.lastIndexOf(",") ? "." : ","
    const milSep = decSep === "." ? "," : "."
    limpio = limpio.split(milSep).join("").replace(decSep, ".")
  } else if (tienePunto || tieneComa) {
    const sep = tienePunto ? "." : ","
    const partes = limpio.split(sep)
    const ultima = partes[partes.length - 1] ?? ""
    limpio =
      partes.length === 2 && ultima.length <= 2
        ? `${partes[0]}.${ultima}`
        : partes.join("")
  }
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}

/** Entero no negativo, o `null` (para "personas a cargo"). */
function aEntero(v: unknown): number | null {
  const n = aNumero(v)
  if (n === null) return null
  const i = Math.trunc(n)
  return i < 0 ? null : i
}

/** Mapea un crudo contra una tabla de alias normalizados → valor de la unión. */
function mapear<T extends string>(
  v: unknown,
  tabla: Record<string, T>,
): T | null {
  const s = str(v)
  if (!s) return null
  return tabla[norm(s)] ?? null
}

const GENERO_ALIAS: Record<string, Genero> = {
  m: "MASCULINO",
  masculino: "MASCULINO",
  hombre: "MASCULINO",
  f: "FEMENINO",
  femenino: "FEMENINO",
  mujer: "FEMENINO",
  otro: "OTRO",
}

const TIPO_DOCUMENTO_ALIAS: Record<string, TipoDocumento> = {
  cc: "CC",
  "cedula de ciudadania": "CC",
  cedula: "CC",
  ce: "CE",
  "cedula de extranjeria": "CE",
  pasaporte: "PASAPORTE",
  pa: "PASAPORTE",
  pep: "PEP",
  ti: "TI",
  "tarjeta de identidad": "TI",
  nit: "NIT",
}

const ESTADO_CIVIL_ALIAS: Record<string, EstadoCivil> = {
  soltero: "SOLTERO",
  soltera: "SOLTERO",
  "soltero(a)": "SOLTERO",
  casado: "CASADO",
  casada: "CASADO",
  "casado(a)": "CASADO",
  "union libre": "UNION_LIBRE",
  union: "UNION_LIBRE",
  separado: "SEPARADO",
  separada: "SEPARADO",
  divorciado: "DIVORCIADO",
  divorciada: "DIVORCIADO",
  viudo: "VIUDO",
  viuda: "VIUDO",
}

const TIPO_EMPLEADO_ALIAS: Record<string, TipoVinculacion> = {
  administrativo: "ADMINISTRATIVO",
  docente: "DOCENTE",
  ops: "OPS",
  "prestacion de servicios": "OPS",
  prestacion: "OPS",
}

const TIPO_CONTRATO_ALIAS: Record<string, TipoContrato> = {
  "termino fijo": "TERMINO_FIJO",
  fijo: "TERMINO_FIJO",
  "termino indefinido": "TERMINO_INDEFINIDO",
  indefinido: "TERMINO_INDEFINIDO",
  "obra o labor": "OBRA_LABOR",
  "obra labor": "OBRA_LABOR",
  obra: "OBRA_LABOR",
  "prestacion de servicios": "PRESTACION_SERVICIOS",
  "prestacion de servicio": "PRESTACION_SERVICIOS",
}

/**
 * Normaliza un lote de registros crudos de Iceberg. `numeroFila` es 1-based sobre
 * el arreglo recibido. Un registro sin documento o sin nombre no se persiste:
 * queda en `errores` para que la previsualización lo muestre.
 */
export function parsearRegistrosIceberg(
  registros: RegistroIcebergCrudo[],
): ResultadoParseoSync {
  const filas: RegistroSyncNormalizado[] = []
  const errores: ErrorParseoFila[] = []

  registros.forEach((r, i) => {
    const numeroFila = i + 1
    const documento = str(r.documento)
    const nombreCompleto = str(r.nombreCompleto)

    if (!documento) {
      errores.push({ numeroFila, motivo: "Registro sin documento." })
      return
    }
    if (!nombreCompleto) {
      errores.push({ numeroFila, motivo: "Registro sin nombre completo." })
      return
    }

    filas.push({
      numeroFila,
      documento,
      nombreCompleto,
      // Personales
      genero: mapear(r.sexo, GENERO_ALIAS),
      tipoDocumento: mapear(r.tipoDocumento, TIPO_DOCUMENTO_ALIAS),
      fechaExpedicion: aFechaIso(r.fechaExpedicion),
      nacionalidad: str(r.nacionalidad),
      fechaNacimiento: aFechaIso(r.fechaNacimiento),
      lugarResidencia: str(r.lugarResidencia),
      direccion: str(r.direccion),
      telefono: str(r.telefono),
      barrio: str(r.barrio),
      estadoCivil: mapear(r.estadoCivil, ESTADO_CIVIL_ALIAS),
      personasACargo: aEntero(r.personasACargo),
      correo: str(r.correo),
      // Contractual
      cargo: str(r.cargo),
      estadoContrato: str(r.estadoContrato),
      centroCostos: str(r.centroCostos),
      fondoSede: str(r.fondoSede),
      fechaIngreso: aFechaIso(r.fechaIngreso),
      fechaFinContrato: aFechaIso(r.fechaFinContrato),
      dependencia: str(r.dependencia),
      tipoEmpleado: mapear(r.tipoEmpleado, TIPO_EMPLEADO_ALIAS),
      tipoContrato: mapear(r.tipoContrato, TIPO_CONTRATO_ALIAS),
      categoria: str(r.categoria),
      // Salarial (sensible)
      salario: aNumero(r.salario),
      eps: str(r.eps),
      fondoPensionCesantias: str(r.fondoPensionCesantias),
      // Bancario (sensible, placeholder)
      certificadoBancario: str(r.certificadoBancario),
    })
  })

  return { filas, errores }
}
