/**
 * ETL — Importación masiva de empleados (Fase 7 del módulo "Administración de
 * Personal"). Lee las 4 hojas de "Base de datos 2026 th - copia.xlsx" y hace un
 * upsert idempotente por `documento` contra `funcionarios` (NÚCLEO: documento,
 * nombre, tipo de vínculo, cargo, área, fecha ingreso/fin, correo, teléfono),
 * insertando SIEMPRE como ACTIVO (fecha_retiro = null, sin aprobaciones).
 *
 * Sprint 3 (v2, Hoja de Vida 360°): además del núcleo, puebla los bloques
 * satélite desde las MISMAS hojas: personales (1-1), contractual extendido
 * (tipo de contrato/modalidad/escalafón/jefe/observación en `funcionarios`),
 * salarial (1-1, SENSIBLE) y formación académica (1-N, una fila por columna
 * de título poblada: técnico/tecnólogo, profesional, especialización,
 * maestría, doctorado, posdoctorado). Los bloques satélite usan COALESCE al
 * escribir: si el humano ya editó un campo desde la UI, el Excel NUNCA lo
 * pisa con null — solo rellena huecos. Formación es insert-once por empleado
 * (si ya tiene algún registro, se salta) para no duplicar en reejecuciones.
 *
 * Fuera de alcance (sin dato estructurado suficiente en el Excel):
 *   - Familiares: la hoja solo trae un conteo (`HIJOS`) sin nombre — no hay
 *     con qué construir un registro `Familiar` real (nombre es obligatorio).
 *   - Experiencia laboral previa: no existe ninguna columna de historial
 *     laboral en ninguna de las 4 hojas.
 * Ambos bloques quedan para captura manual vía la UI (`/personal/:id`).
 *
 * Precondición dura: las migraciones 0009_administracion_personal.sql y
 * 0010_hoja_de_vida_360.sql deben estar aplicadas antes de correr este script.
 *
 * Uso:
 *   npx tsx scripts/importarEmpleados.ts --archivo "C:\ruta\archivo.xlsx" [--aplicar]
 *
 * Sin `--aplicar` corre en modo DRY-RUN (solo reporta, no escribe en BD).
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as XLSX from "xlsx"
import { Client } from "pg"
import dotenv from "dotenv"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") })

type TipoVinculacion = "ADMINISTRATIVO" | "DOCENTE" | "OPS"

interface EmpleadoCore {
  documento: string
  nombreCompleto: string
  tipoVinculacion: TipoVinculacion
  cargo: string
  areaOrigen: string
  fechaIngreso: string | null
  fechaFinContrato: string | null
  correoInstitucional: string | null
  telefono: string | null
  origen: string // hoja de procedencia, solo para el log
}

interface Omitida {
  documento: string
  hoja: string
  motivo: string
}

/** Aviso no bloqueante: la fila SÍ se importa, pero un campo no núcleo quedó en null. */
interface Aviso {
  documento: string
  hoja: string
  motivo: string
}

// ── Sprint 3: bloques satélite (Hoja de Vida 360°) ──────────────────────────

type TipoContrato = "TERMINO_FIJO" | "TERMINO_INDEFINIDO" | "OBRA_LABOR" | "PRESTACION_SERVICIOS"
type Modalidad = "PRESENCIAL" | "HIBRIDO" | "VIRTUAL"
type Genero = "MASCULINO" | "FEMENINO" | "OTRO"
type NivelFormacion =
  | "BACHILLER"
  | "TECNICO"
  | "TECNOLOGO"
  | "PROFESIONAL"
  | "ESPECIALIZACION"
  | "MAESTRIA"
  | "DOCTORADO"
  | "POSTDOCTORADO"

interface PersonalesExt {
  fechaExpedicion: string | null
  lugarExpedicion: string | null
  fechaNacimiento: string | null
  lugarNacimiento: string | null
  genero: Genero | null
  direccion: string | null
  barrio: string | null
  municipio: string | null
  correoPersonal: string | null
}

interface ContractualExt {
  tipoContrato: TipoContrato | null
  modalidad: Modalidad | null
  escalafon: string | null
  jefeInmediato: string | null
  fechaPrimerIngreso: string | null
  observacion: string | null
}

interface SalarialExt {
  salarioBasico: number | null
  auxilioTransporte: number | null
  promedioDevengado: number | null
  valorEnLetras: string | null
  honorarios: number | null
  eps: string | null
  afp: string | null
}

interface FormacionExt {
  nivel: NivelFormacion
  titulo: string
}

interface EmpleadoExtendido {
  documento: string
  origen: string
  personales: PersonalesExt
  contractual: ContractualExt
  salarial: SalarialExt
  formacion: FormacionExt[]
}

// ── Args ─────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]) {
  const archivoIdx = argv.indexOf("--archivo")
  const archivo =
    archivoIdx >= 0 && argv[archivoIdx + 1]
      ? argv[archivoIdx + 1]
      : "C:\\Users\\Leonardo\\Downloads\\Base de datos 2026 th - copia.xlsx"
  const aplicar = argv.includes("--aplicar")
  return { archivo, aplicar }
}

// ── Normalización ────────────────────────────────────────────────────────

function normalizarDocumento(raw: string): string {
  return String(raw).replace(/\D/g, "")
}

function normalizarTexto(raw: string): string {
  return String(raw).replace(/\s+/g, " ").trim()
}

/** Trim + colapsa espacios; conserva may/min original salvo estandarizar áreas comunes. */
function normalizarArea(raw: string): string {
  return normalizarTexto(raw)
}

function tituloCase(raw: string): string {
  const s = normalizarTexto(raw).toLowerCase()
  return s.replace(/(^|\s)([a-záéíóúñü])/g, (_, sep, ch) => sep + ch.toUpperCase())
}

/** "N/A", "-" o vacío tras normalizar: la hoja usa estos como "sin dato". */
function esVacioOna(raw: unknown): boolean {
  const s = normalizarTexto(String(raw ?? ""))
  return s === "" || s === "-" || /^n\/?a$/i.test(s)
}

function textoOpcional(raw: unknown): string | null {
  if (esVacioOna(raw)) return null
  return normalizarTexto(String(raw))
}

/**
 * Montos vienen en 2 formatos según la hoja: ADM/consolidada/ops usan coma como
 * separador de miles (" 2,100,000 "), ACD usa PUNTO (" 1.750.905 ") — confirmado
 * inspeccionando filas reales, no es un error de captura aislado. Ningún salario
 * en estas 4 hojas usa decimales (pesos colombianos enteros), así que es seguro
 * tratar tanto "," como "." como separador de miles y descartarlos por completo
 * en vez de intentar adivinar cuál es el punto decimal.
 */
function normalizarDinero(raw: unknown): number | null {
  const s = String(raw ?? "").replace(/[^\d]/g, "")
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function mapTipoContrato(raw: unknown): TipoContrato | null {
  const s = normalizarTexto(String(raw ?? "")).toLowerCase()
  if (s === "") return null
  if (s.includes("indefinid")) return "TERMINO_INDEFINIDO"
  if (s.includes("obra") || s.includes("labor")) return "OBRA_LABOR"
  if (s.includes("ops") || s.includes("prestacion") || s.includes("servicio")) return "PRESTACION_SERVICIOS"
  if (s.includes("fijo")) return "TERMINO_FIJO"
  return null
}

function mapModalidad(raw: unknown): Modalidad | null {
  const s = normalizarTexto(String(raw ?? "")).toLowerCase()
  if (s.includes("presencial")) return "PRESENCIAL"
  if (s.includes("virtual")) return "VIRTUAL"
  if (s.includes("hibrid")) return "HIBRIDO"
  return null
}

function mapGenero(raw: unknown): Genero | null {
  const s = normalizarTexto(String(raw ?? "")).toLowerCase()
  if (s === "") return null
  if (s.startsWith("fem")) return "FEMENINO"
  if (s.startsWith("mas")) return "MASCULINO"
  return "OTRO"
}

const MESES: Record<string, number> = {
  enero: 1,
  january: 1,
  febrero: 2,
  february: 2,
  marzo: 3,
  march: 3,
  abril: 4,
  april: 4,
  mayo: 5,
  may: 5,
  junio: 6,
  june: 6,
  julio: 7,
  july: 7,
  agosto: 8,
  august: 8,
  septiembre: 9,
  setiembre: 9,
  september: 9,
  octubre: 10,
  october: 10,
  noviembre: 11,
  november: 11,
  diciembre: 12,
  december: 12,
}

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

function serialExcelAFecha(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 80000) return null
  const ms = EXCEL_EPOCH_MS + serial * 86400000
  const d = new Date(ms)
  return isoDeUTC(d)
}

function isoDeUTC(d: Date): string {
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function fechaValida(anio: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || anio < 1950 || anio > 2100) return null
  const d = new Date(Date.UTC(anio, mes - 1, dia))
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return isoDeUTC(d)
}

/**
 * Parseo de fechas robusto: prosa en español/inglés ("30 DE JUNIO DE 2026",
 * "30 de November de 2026"), serial de Excel ("45333"), y slash-date cuya
 * interpretación depende de la hoja de origen (`formatoUS`: la hoja consolidada
 * usa M/D/YY; ADM/ACD/ops usan D/M/YYYY, como corresponde a prosa en español).
 */
function parseFecha(raw: unknown, formatoUS: boolean): string | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim()
  if (s === "" || s === "-" || /^n\/?a$/i.test(s)) return null

  // Serial de Excel (número puro, típicamente 5 dígitos)
  if (/^\d{4,6}$/.test(s)) {
    const asSerial = serialExcelAFecha(Number(s))
    if (asSerial) return asSerial
  }

  // Slash date: D/M/YYYY|YY o M/D/YYYY|YY según la hoja
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slash) {
    let [, a, b, y] = slash
    let anio = Number(y)
    if (anio < 100) anio += anio < 70 ? 2000 : 1900
    const primero = Number(a)
    const segundo = Number(b)
    const [dia, mes] = formatoUS ? [segundo, primero] : [primero, segundo]
    const f = fechaValida(anio, mes, dia)
    if (f) return f
  }

  // Prosa "D DE MES DE AAAA" / "D de MES AAAA" (mezcla ES/EN, "DE" final opcional)
  const prosa = s
    .toLowerCase()
    .match(/^(\d{1,2})\s*(?:de)?\s*([a-záéíóúñ]+)\s*(?:de)?\s*(\d{4})$/)
  if (prosa) {
    const [, diaStr, mesTxt, anioStr] = prosa
    const mes = MESES[mesTxt.trim()]
    if (mes) {
      const f = fechaValida(Number(anioStr), mes, Number(diaStr))
      if (f) return f
    }
  }

  return null
}

// ── Mapeo por hoja ───────────────────────────────────────────────────────

function col(header: string[], nombre: string): number {
  return header.findIndex((h) => normalizarTexto(String(h)).toUpperCase() === nombre.toUpperCase())
}

function colIncluye(header: string[], fragmento: string): number {
  return header.findIndex((h) => normalizarTexto(String(h)).toUpperCase().includes(fragmento.toUpperCase()))
}

function leerHojaNucleo(
  rows: unknown[][],
  hoja: string,
  tipoFijo: TipoVinculacion | null,
  formatoUSFechas: boolean,
  omitidas: Omitida[],
  avisos: Aviso[],
): EmpleadoCore[] {
  const header = (rows[0] ?? []).map((h) => String(h ?? ""))
  const idxDoc = col(header, "DOCUMENTO")
  const idxNombre = col(header, "NOMBRE COMPLETO")
  const idxCargo =
    col(header, "CARGO") >= 0 ? col(header, "CARGO") : colIncluye(header, "CARGO")
  const idxArea = col(header, "AREA") >= 0 ? col(header, "AREA") : col(header, "ÁREA")
  const idxPrograma = col(header, "PROGRAMA")
  const idxCorreoInst = colIncluye(header, "CORREO INSTITUCIONAL")
  const idxTelefono = col(header, "TELEFONO")
  const idxIngreso = colIncluye(header, "1ER INGRESO")
  const idxFin = colIncluye(header, "FECHA FIN")

  const out: EmpleadoCore[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const docRaw = String(r[idxDoc] ?? "").trim()
    if (docRaw === "") continue // fila de relleno del padding de la hoja

    const documento = normalizarDocumento(docRaw)
    if (documento.length < 5) {
      omitidas.push({ documento: docRaw, hoja, motivo: "documento inválido tras normalizar" })
      continue
    }

    const nombreCompleto = tituloCase(String(r[idxNombre] ?? ""))
    if (nombreCompleto.length < 3) {
      omitidas.push({ documento, hoja, motivo: "nombre vacío o inválido" })
      continue
    }

    const cargo = normalizarTexto(String(r[idxCargo] ?? "")) || "Sin cargo asignado"
    const areaOrigen = normalizarArea(String(r[idxArea] ?? "")) || "Sin área asignada"

    let tipoVinculacion: TipoVinculacion
    if (tipoFijo) {
      tipoVinculacion = tipoFijo
    } else {
      const programa = normalizarTexto(String(r[idxPrograma] ?? "")).toLowerCase()
      tipoVinculacion = programa.includes("acad") ? "DOCENTE" : "ADMINISTRATIVO"
    }

    const correoInstitucional = normalizarTexto(String(r[idxCorreoInst] ?? "")) || null
    const telefono = normalizarTexto(String(r[idxTelefono] ?? "")) || null
    const fechaIngreso = parseFecha(r[idxIngreso], formatoUSFechas)
    const fechaFinContrato = parseFecha(r[idxFin], formatoUSFechas)
    if (fechaIngreso === null && normalizarTexto(String(r[idxIngreso] ?? "")) !== "") {
      avisos.push({
        documento,
        hoja,
        motivo: `fecha de ingreso no reconocida (queda null): "${String(r[idxIngreso])}"`,
      })
    }
    if (fechaFinContrato === null && normalizarTexto(String(r[idxFin] ?? "")) !== "") {
      avisos.push({
        documento,
        hoja,
        motivo: `fecha fin de contrato no reconocida (queda null): "${String(r[idxFin])}"`,
      })
    }

    out.push({
      documento,
      nombreCompleto,
      tipoVinculacion,
      cargo,
      areaOrigen,
      fechaIngreso,
      fechaFinContrato,
      correoInstitucional,
      telefono,
      origen: hoja,
    })
  }

  return out
}

/**
 * Lectura del bloque satélite (Sprint 3): mismas filas que `leerHojaNucleo`,
 * columnas distintas. No genera `Omitida`/`Aviso` propios — un documento
 * inválido ya quedó fuera por el pase de núcleo; aquí solo se salta sin loguear
 * dos veces. Formación: una entrada por cada columna de título poblada
 * (ignora "N/A"/vacío); "TECNICO / TECNOLOGO" se desambigua por el texto.
 */
function leerHojaExtendida(rows: unknown[][], hoja: string, formatoUSFechas: boolean): EmpleadoExtendido[] {
  const header = (rows[0] ?? []).map((h) => String(h ?? ""))
  const idxDoc = col(header, "DOCUMENTO")
  const idxFechaExp = colIncluye(header, "FECHA DE EXPEDICION")
  const idxLugarExp = colIncluye(header, "LUGAR DE EXPEDICION")
  const idxFechaNac = colIncluye(header, "FECHA DE NACIMIENTO")
  const idxLugarNac = colIncluye(header, "LUGAR DE NACIMIENTO")
  const idxGenero = col(header, "GENERO")
  const idxDireccion = col(header, "DIRECCION")
  const idxBarrio = col(header, "BARRIO")
  const idxMunicipio = col(header, "MUNICIPIO")
  const idxCorreoPersonal = colIncluye(header, "CORREO PERSONAL")
  const idxJefe = colIncluye(header, "JEFE INMEDIATO")
  const idxTipoContrato = colIncluye(header, "TIPO DE CONTRATO")
  const idxModalidad = colIncluye(header, "MODA") // cubre el typo real "MODADILDAD"
  const idxEscalafon = colIncluye(header, "ESCAL") // cubre "ESCALAFON"/"ESCALFON"
  const idxIngreso = colIncluye(header, "1ER INGRESO")
  const idxObservacion = col(header, "OBSERVACION")
  const idxValorLetras = colIncluye(header, "VALOR EN LETRAS")
  const idxSalario = colIncluye(header, "SALARIO B")
  const idxAuxilio = colIncluye(header, "AUXILIO")
  const idxPromedio = colIncluye(header, "PROMEDIO DEVENGADO")
  const idxHonorarios = colIncluye(header, "HONORARIOS")
  const idxEps = col(header, "EPS")
  const idxAfp = col(header, "AFP")
  const idxTecTec = colIncluye(header, "TECNICO")
  const idxProfesional = colIncluye(header, "TITULO PROFESIONAL")
  const idxEspecializacion =
    colIncluye(header, "ESPCEIALIZACION") >= 0
      ? colIncluye(header, "ESPCEIALIZACION")
      : colIncluye(header, "ESPECIALIZACION")
  const idxMaestria = col(header, "MAESTRIA")
  const idxDoctorado = col(header, "DOCTORADO")
  const idxPostDoctoral = colIncluye(header, "POST DOCTORAL")

  const out: EmpleadoExtendido[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const docRaw = String(r[idxDoc] ?? "").trim()
    if (docRaw === "") continue
    const documento = normalizarDocumento(docRaw)
    if (documento.length < 5) continue

    const formacion: FormacionExt[] = []
    const agregarFormacion = (idx: number, nivel: NivelFormacion, desambiguarTecnologo = false) => {
      if (idx < 0 || esVacioOna(r[idx])) return
      const titulo = normalizarTexto(String(r[idx]))
      const nivelFinal =
        desambiguarTecnologo && titulo.toLowerCase().includes("tecnolog") ? "TECNOLOGO" : nivel
      formacion.push({ nivel: nivelFinal, titulo })
    }
    agregarFormacion(idxTecTec, "TECNICO", true)
    agregarFormacion(idxProfesional, "PROFESIONAL")
    agregarFormacion(idxEspecializacion, "ESPECIALIZACION")
    agregarFormacion(idxMaestria, "MAESTRIA")
    agregarFormacion(idxDoctorado, "DOCTORADO")
    agregarFormacion(idxPostDoctoral, "POSTDOCTORADO")

    out.push({
      documento,
      origen: hoja,
      personales: {
        fechaExpedicion: parseFecha(r[idxFechaExp], formatoUSFechas),
        lugarExpedicion: textoOpcional(r[idxLugarExp]),
        fechaNacimiento: parseFecha(r[idxFechaNac], formatoUSFechas),
        lugarNacimiento: textoOpcional(r[idxLugarNac]),
        genero: mapGenero(r[idxGenero]),
        direccion: textoOpcional(r[idxDireccion]),
        barrio: textoOpcional(r[idxBarrio]),
        municipio: textoOpcional(r[idxMunicipio]),
        correoPersonal: textoOpcional(r[idxCorreoPersonal]),
      },
      contractual: {
        tipoContrato: mapTipoContrato(r[idxTipoContrato]),
        modalidad: mapModalidad(r[idxModalidad]),
        escalafon: idxEscalafon >= 0 ? textoOpcional(r[idxEscalafon]) : null,
        jefeInmediato: textoOpcional(r[idxJefe]),
        fechaPrimerIngreso: parseFecha(r[idxIngreso], formatoUSFechas),
        observacion: textoOpcional(r[idxObservacion]),
      },
      salarial: {
        salarioBasico: normalizarDinero(r[idxSalario]),
        auxilioTransporte: normalizarDinero(r[idxAuxilio]),
        promedioDevengado: normalizarDinero(r[idxPromedio]),
        valorEnLetras: textoOpcional(r[idxValorLetras]),
        honorarios: normalizarDinero(r[idxHonorarios]),
        eps: idxEps >= 0 ? textoOpcional(r[idxEps]) : null,
        afp: idxAfp >= 0 ? textoOpcional(r[idxAfp]) : null,
      },
      formacion,
    })
  }

  return out
}

/** Mismo criterio de prioridad que `dedupPorDocumento`, sin loguear (ya se logueó en núcleo). */
function dedupExtendido(todas: EmpleadoExtendido[][]): Map<string, EmpleadoExtendido> {
  const [adm, consolidada, ops, acd] = todas
  const prioridad = [consolidada, adm, acd, ops]
  const mapa = new Map<string, EmpleadoExtendido>()
  for (const grupo of prioridad) {
    for (const e of grupo) {
      if (!mapa.has(e.documento)) mapa.set(e.documento, e)
    }
  }
  return mapa
}

// ── Dedup ────────────────────────────────────────────────────────────────

/** Gana la hoja consolidada ("Base de datos"); entre las demás, la última vista. */
function dedupPorDocumento(todas: EmpleadoCore[][], omitidas: Omitida[]): EmpleadoCore[] {
  const [adm, consolidada, ops, acd] = todas
  const prioridad = [consolidada, adm, acd, ops] // consolidada gana
  const mapa = new Map<string, EmpleadoCore>()

  for (const grupo of prioridad) {
    for (const e of grupo) {
      const previo = mapa.get(e.documento)
      if (previo && previo.origen !== e.origen) {
        omitidas.push({
          documento: e.documento,
          hoja: e.origen,
          motivo: `duplicado — gana la fila de "${previo.origen}"`,
        })
        continue
      }
      mapa.set(e.documento, e)
    }
  }

  return [...mapa.values()]
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const { archivo, aplicar } = parseArgs(process.argv.slice(2))

  if (!existsSync(archivo)) {
    console.error(`✗ No se encontró el archivo fuente: ${archivo}`)
    process.exit(1)
  }

  console.log(`Leyendo ${archivo}…`)
  const wb = XLSX.read(readFileSync(archivo), { type: "buffer" })

  const hojaADM = wb.Sheets["ADM"]
  const hojaConsolidada = wb.Sheets[wb.SheetNames.find((n) => n.trim() === "Base de datos") ?? "Base de datos "]
  const hojaOps = wb.Sheets["ops"]
  const hojaACD = wb.Sheets["ACD"]

  if (!hojaADM || !hojaConsolidada || !hojaOps || !hojaACD) {
    console.error(`✗ Faltan hojas esperadas. Hojas encontradas: ${wb.SheetNames.join(", ")}`)
    process.exit(1)
  }

  const omitidas: Omitida[] = []
  const avisos: Aviso[] = []

  const filasADM = XLSX.utils.sheet_to_json<unknown[]>(hojaADM, { header: 1, raw: false, defval: "" })
  const filasConsolidada = XLSX.utils.sheet_to_json<unknown[]>(hojaConsolidada, {
    header: 1,
    raw: false,
    defval: "",
  })
  const filasOps = XLSX.utils.sheet_to_json<unknown[]>(hojaOps, { header: 1, raw: false, defval: "" })
  const filasACD = XLSX.utils.sheet_to_json<unknown[]>(hojaACD, { header: 1, raw: false, defval: "" })

  const adm = leerHojaNucleo(filasADM, "ADM", "ADMINISTRATIVO", false, omitidas, avisos)
  const consolidada = leerHojaNucleo(filasConsolidada, "Base de datos", null, true, omitidas, avisos)
  const ops = leerHojaNucleo(filasOps, "ops", "OPS", false, omitidas, avisos)
  const acd = leerHojaNucleo(filasACD, "ACD", "DOCENTE", false, omitidas, avisos)

  console.log(`  ADM: ${adm.length} · consolidada: ${consolidada.length} · ops: ${ops.length} · ACD: ${acd.length}`)

  const empleados = dedupPorDocumento([adm, consolidada, ops, acd], omitidas)
  console.log(`Total únicos tras dedup: ${empleados.length} (omitidas por duplicado/inválidas: ${omitidas.length})`)
  console.log(
    `Avisos no bloqueantes (fecha de ingreso/fin no reconocida, queda null): ${avisos.length}`,
  )

  // Sprint 3: bloques satélite (personales, contractual extendido, salarial, formación).
  const admExt = leerHojaExtendida(filasADM, "ADM", false)
  const consolidadaExt = leerHojaExtendida(filasConsolidada, "Base de datos", true)
  const opsExt = leerHojaExtendida(filasOps, "ops", false)
  const acdExt = leerHojaExtendida(filasACD, "ACD", false)
  const extendidoPorDocumento = dedupExtendido([admExt, consolidadaExt, opsExt, acdExt])
  const conFormacion = [...extendidoPorDocumento.values()].filter((e) => e.formacion.length > 0).length
  const conSalario = [...extendidoPorDocumento.values()].filter(
    (e) => e.salarial.salarioBasico !== null || e.salarial.honorarios !== null,
  ).length
  console.log(
    `Bloques satélite leídos: ${extendidoPorDocumento.size} empleados con datos extendidos · ` +
      `${conFormacion} con al menos 1 registro de formación · ${conSalario} con salario/honorarios.`,
  )
  console.log(
    "Nota: familiares (sin nombre en el Excel, solo conteo) y experiencia laboral previa " +
      "(sin columnas en el Excel) NO se importan — quedan para captura manual en la UI.",
  )

  if (!aplicar) {
    console.log("\n— DRY RUN (sin --aplicar): no se escribió nada en la base de datos —")
    console.log("Muestra de las primeras 5 filas a insertar:")
    for (const e of empleados.slice(0, 5)) {
      console.log(
        `  ${e.documento} · ${e.nombreCompleto} · ${e.tipoVinculacion} · ${e.cargo} · ${e.areaOrigen} · ingreso=${e.fechaIngreso} · fin=${e.fechaFinContrato}`,
      )
      const ext = extendidoPorDocumento.get(e.documento)
      if (ext) {
        console.log(
          `    [personales] género=${ext.personales.genero} nacimiento=${ext.personales.fechaNacimiento} municipio=${ext.personales.municipio}`,
        )
        console.log(
          `    [contractual] tipoContrato=${ext.contractual.tipoContrato} modalidad=${ext.contractual.modalidad} jefe=${ext.contractual.jefeInmediato}`,
        )
        console.log(
          `    [salarial] básico=${ext.salarial.salarioBasico} honorarios=${ext.salarial.honorarios} eps=${ext.salarial.eps}`,
        )
        console.log(
          `    [formación] ${ext.formacion.map((f) => `${f.nivel}:${f.titulo}`).join(" | ") || "(ninguna)"}`,
        )
      }
    }
    if (omitidas.length > 0) {
      console.log("\nOmitidas (muestra 10):")
      for (const o of omitidas.slice(0, 10)) {
        console.log(`  [${o.hoja}] ${o.documento}: ${o.motivo}`)
      }
    }
    if (avisos.length > 0) {
      console.log("\nAvisos no bloqueantes (muestra 5):")
      for (const a of avisos.slice(0, 5)) {
        console.log(`  [${a.hoja}] ${a.documento}: ${a.motivo}`)
      }
    }
    return
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("✗ DATABASE_URL no está definida (apps/backend/.env).")
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  let insertados = 0
  let actualizados = 0
  let fallidos = 0
  const extStats = { personales: 0, contractual: 0, salarial: 0, formacionFilas: 0, formacionSaltada: 0 }

  try {
    for (const e of empleados) {
      try {
        const res = await client.query(
          `insert into funcionarios
             (documento, nombre_completo, tipo_vinculacion, cargo, area_origen,
              fecha_ingreso, fecha_fin_contrato, correo_institucional, telefono, fecha_retiro)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, null)
           on conflict (documento) do update set
             nombre_completo = excluded.nombre_completo,
             tipo_vinculacion = excluded.tipo_vinculacion,
             cargo = excluded.cargo,
             area_origen = excluded.area_origen,
             fecha_ingreso = excluded.fecha_ingreso,
             fecha_fin_contrato = excluded.fecha_fin_contrato,
             correo_institucional = excluded.correo_institucional,
             telefono = excluded.telefono,
             updated_at = now()
           where funcionarios.fecha_retiro is null
           returning id, (xmax = 0) as fue_insercion`,
          [
            e.documento,
            e.nombreCompleto,
            e.tipoVinculacion,
            e.cargo,
            e.areaOrigen,
            e.fechaIngreso,
            e.fechaFinContrato,
            e.correoInstitucional,
            e.telefono,
          ],
        )
        if (res.rowCount === 0) {
          // Ya existe con fecha_retiro NOT NULL (en trámite/retirado) → no se toca.
          omitidas.push({ documento: e.documento, hoja: e.origen, motivo: "ya en trámite de Paz y Salvo, no se sobrescribe" })
          continue
        }
        if (res.rows[0]?.fue_insercion) insertados++
        else actualizados++

        const funcionarioId = res.rows[0]?.id as string
        const ext = extendidoPorDocumento.get(e.documento)
        if (funcionarioId && ext) {
          await aplicarBloquesExtendidos(client, funcionarioId, ext, extStats)
        }
      } catch (err) {
        fallidos++
        omitidas.push({
          documento: e.documento,
          hoja: e.origen,
          motivo: `error de BD: ${err instanceof Error ? err.message : String(err)}`,
        })
      }
    }
  } finally {
    await client.end()
  }

  console.log(`\n✓ Importación aplicada.`)
  console.log(`  Insertados: ${insertados} · Actualizados: ${actualizados} · Fallidos: ${fallidos}`)
  console.log(`  Omitidas totales (dedup + inválidas + en-trámite + error): ${omitidas.length}`)
  if (omitidas.length > 0) {
    console.log("  Detalle de omitidas:")
    for (const o of omitidas) {
      console.log(`    [${o.hoja}] ${o.documento}: ${o.motivo}`)
    }
  }
  console.log(`  Avisos no bloqueantes (fecha ingreso/fin sin reconocer): ${avisos.length}`)
  console.log(
    `  Bloques satélite — personales: ${extStats.personales} · contractual: ${extStats.contractual} · ` +
      `salarial: ${extStats.salarial} · formación insertada: ${extStats.formacionFilas} filas ` +
      `(${extStats.formacionSaltada} empleados saltados por ya tener formación registrada).`,
  )
}

/**
 * Escribe los bloques satélite del empleado. COALESCE en cada campo: el Excel
 * solo RELLENA huecos, nunca pisa un valor que el humano ya haya editado desde
 * la UI (`/personal/:id`). Formación es insert-once: si el empleado ya tiene
 * algún registro, se salta por completo (evita duplicar en reejecuciones y
 * respeta ediciones manuales, ya que no hay clave natural para upsert 1-N).
 */
async function aplicarBloquesExtendidos(
  client: Client,
  funcionarioId: string,
  ext: EmpleadoExtendido,
  stats: { personales: number; contractual: number; salarial: number; formacionFilas: number; formacionSaltada: number },
) {
  const { personales, contractual, salarial, formacion } = ext

  if (Object.values(contractual).some((v) => v !== null)) {
    await client.query(
      `update funcionarios set
         tipo_contrato = coalesce($2::tipo_contrato, tipo_contrato),
         modalidad = coalesce($3::modalidad, modalidad),
         escalafon = coalesce($4, escalafon),
         jefe_inmediato = coalesce($5, jefe_inmediato),
         fecha_primer_ingreso = coalesce($6::date, fecha_primer_ingreso),
         observacion = coalesce($7, observacion),
         updated_at = now()
       where id = $1`,
      [
        funcionarioId,
        contractual.tipoContrato,
        contractual.modalidad,
        contractual.escalafon,
        contractual.jefeInmediato,
        contractual.fechaPrimerIngreso,
        contractual.observacion,
      ],
    )
    stats.contractual++
  }

  if (Object.values(personales).some((v) => v !== null)) {
    await client.query(
      `insert into empleado_personales
         (funcionario_id, fecha_expedicion, lugar_expedicion, fecha_nacimiento, lugar_nacimiento,
          genero, direccion, barrio, municipio, correo_personal)
       values ($1, $2, $3, $4, $5, $6::genero, $7, $8, $9, $10)
       on conflict (funcionario_id) do update set
         fecha_expedicion = coalesce(excluded.fecha_expedicion, empleado_personales.fecha_expedicion),
         lugar_expedicion = coalesce(excluded.lugar_expedicion, empleado_personales.lugar_expedicion),
         fecha_nacimiento = coalesce(excluded.fecha_nacimiento, empleado_personales.fecha_nacimiento),
         lugar_nacimiento = coalesce(excluded.lugar_nacimiento, empleado_personales.lugar_nacimiento),
         genero = coalesce(excluded.genero, empleado_personales.genero),
         direccion = coalesce(excluded.direccion, empleado_personales.direccion),
         barrio = coalesce(excluded.barrio, empleado_personales.barrio),
         municipio = coalesce(excluded.municipio, empleado_personales.municipio),
         correo_personal = coalesce(excluded.correo_personal, empleado_personales.correo_personal),
         updated_at = now()`,
      [
        funcionarioId,
        personales.fechaExpedicion,
        personales.lugarExpedicion,
        personales.fechaNacimiento,
        personales.lugarNacimiento,
        personales.genero,
        personales.direccion,
        personales.barrio,
        personales.municipio,
        personales.correoPersonal,
      ],
    )
    stats.personales++
  }

  if (Object.values(salarial).some((v) => v !== null)) {
    await client.query(
      `insert into empleado_salarial
         (funcionario_id, salario_basico, auxilio_transporte, promedio_devengado, valor_en_letras,
          honorarios, eps, afp)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (funcionario_id) do update set
         salario_basico = coalesce(excluded.salario_basico, empleado_salarial.salario_basico),
         auxilio_transporte = coalesce(excluded.auxilio_transporte, empleado_salarial.auxilio_transporte),
         promedio_devengado = coalesce(excluded.promedio_devengado, empleado_salarial.promedio_devengado),
         valor_en_letras = coalesce(excluded.valor_en_letras, empleado_salarial.valor_en_letras),
         honorarios = coalesce(excluded.honorarios, empleado_salarial.honorarios),
         eps = coalesce(excluded.eps, empleado_salarial.eps),
         afp = coalesce(excluded.afp, empleado_salarial.afp),
         updated_at = now()`,
      [
        funcionarioId,
        salarial.salarioBasico,
        salarial.auxilioTransporte,
        salarial.promedioDevengado,
        salarial.valorEnLetras,
        salarial.honorarios,
        salarial.eps,
        salarial.afp,
      ],
    )
    stats.salarial++
  }

  if (formacion.length > 0) {
    const { rows } = await client.query<{ n: string }>(
      `select count(*)::int as n from empleado_formacion where funcionario_id = $1`,
      [funcionarioId],
    )
    if (Number(rows[0]?.n ?? 0) > 0) {
      stats.formacionSaltada++
    } else {
      for (const f of formacion) {
        await client.query(
          `insert into empleado_formacion (funcionario_id, nivel, titulo) values ($1, $2::nivel_formacion, $3)`,
          [funcionarioId, f.nivel, f.titulo],
        )
        stats.formacionFilas++
      }
    }
  }
}

main().catch((err) => {
  console.error("✗ Falló la importación:", err)
  process.exit(1)
})
