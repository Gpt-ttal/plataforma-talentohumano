import { describe, it, expect } from "vitest"
import {
  asignarRolSchema,
  cambiarActivaAreaSchema,
  cambiarEstadoAreaSchema,
  cambiarEstadoUsuarioSchema,
  crearAreaSchema,
  crearCapacitacionSchema,
  crearCapacitacionPlaneadaSchema,
  crearCursoSchema,
  crearLeccionSchema,
  editarCapacitacionSchema,
  editarCapacitacionPlaneadaSchema,
  editarCursoSchema,
  editarLeccionSchema,
  filtroCapacitacionesSchema,
  filtroCapacitacionesPlaneadasSchema,
  filtroCursosSchema,
  filtroFuncionariosSchema,
  filtroMiAreaSchema,
  ingresarCursoSchema,
  moverAreaSchema,
  registrarAsistenciaSchema,
  renombrarAreaSchema,
} from "../src/schemas"

const UUID_A = "11111111-1111-4111-8111-111111111111"
const UUID_B = "22222222-2222-4222-8222-222222222222"

describe("cambiarEstadoAreaSchema", () => {
  it("rechaza estado inválido", () => {
    const r = cambiarEstadoAreaSchema.safeParse({ funcionarioId: UUID_A, areaId: UUID_B, estado: "XXX" })
    expect(r.success).toBe(false)
  })
  it("acepta payload válido con observación opcional", () => {
    const r = cambiarEstadoAreaSchema.safeParse({ funcionarioId: UUID_A, areaId: UUID_B, estado: "APROBADO" })
    expect(r.success).toBe(true)
  })
  it("rechaza IDs que no son UUID", () => {
    const r = cambiarEstadoAreaSchema.safeParse({ funcionarioId: "f1", areaId: "a1", estado: "APROBADO" })
    expect(r.success).toBe(false)
  })
  it("rechaza una observación que queda vacía tras recortar", () => {
    const r = cambiarEstadoAreaSchema.safeParse({
      funcionarioId: UUID_A,
      areaId: UUID_B,
      estado: "NO_APROBADO",
      observacion: "   ",
    })
    expect(r.success).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    const r = cambiarEstadoAreaSchema.safeParse({
      funcionarioId: UUID_A,
      areaId: UUID_B,
      estado: "APROBADO",
      malicioso: true,
    })
    expect(r.success).toBe(false)
  })
})

describe("asignarRolSchema", () => {
  it("acepta rol válido con areaId UUID o null", () => {
    expect(asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "AREA", areaId: UUID_B }).success).toBe(true)
    expect(asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "TALENTO_HUMANO", areaId: null }).success).toBe(true)
  })
  it("rechaza rol inválido", () => {
    expect(asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "ROOT" }).success).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    expect(
      asignarRolSchema.safeParse({ usuarioId: UUID_A, rol: "AREA", areaId: UUID_B, x: 1 }).success,
    ).toBe(false)
  })
})

describe("cambiarEstadoUsuarioSchema", () => {
  it("acepta un estado de usuario válido", () => {
    expect(cambiarEstadoUsuarioSchema.safeParse({ usuarioId: UUID_A, estado: "INACTIVO" }).success).toBe(true)
  })
  it("rechaza estado inválido", () => {
    expect(cambiarEstadoUsuarioSchema.safeParse({ usuarioId: UUID_A, estado: "BORRADO" }).success).toBe(false)
  })
})

describe("filtroFuncionariosSchema (coerción y topes)", () => {
  it("coacciona strings numéricos de pagina/porPagina", () => {
    const r = filtroFuncionariosSchema.safeParse({ pagina: "2", porPagina: "10" })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.pagina).toBe(2)
      expect(r.data.porPagina).toBe(10)
    }
  })
  it("rechaza pagina < 1", () => {
    expect(filtroFuncionariosSchema.safeParse({ pagina: "0" }).success).toBe(false)
  })
  it("rechaza porPagina por encima del tope (max 100, anti-DoS)", () => {
    expect(filtroFuncionariosSchema.safeParse({ porPagina: "999" }).success).toBe(false)
  })
})

describe("schemas del catálogo de áreas", () => {
  it("crearArea recorta el nombre y exige 2–80 chars", () => {
    expect(crearAreaSchema.safeParse({ nombre: "Bienestar" }).success).toBe(true)
    expect(crearAreaSchema.safeParse({ nombre: " A " }).success).toBe(false)
    expect(crearAreaSchema.safeParse({ nombre: "x".repeat(81) }).success).toBe(false)
  })
  it("crearArea rechaza claves extra (.strict)", () => {
    expect(crearAreaSchema.safeParse({ nombre: "Bienestar", id: UUID_A }).success).toBe(false)
  })
  it("renombrarArea exige UUID + nombre válido", () => {
    expect(renombrarAreaSchema.safeParse({ areaId: UUID_A, nombre: "Sistemas" }).success).toBe(true)
    expect(renombrarAreaSchema.safeParse({ areaId: "a1", nombre: "Sistemas" }).success).toBe(false)
  })
  it("cambiarActivaArea exige booleano", () => {
    expect(cambiarActivaAreaSchema.safeParse({ areaId: UUID_A, activa: false }).success).toBe(true)
    expect(cambiarActivaAreaSchema.safeParse({ areaId: UUID_A, activa: "no" }).success).toBe(false)
  })
  it("moverArea solo acepta subir | bajar", () => {
    expect(moverAreaSchema.safeParse({ areaId: UUID_A, direccion: "subir" }).success).toBe(true)
    expect(moverAreaSchema.safeParse({ areaId: UUID_A, direccion: "saltar" }).success).toBe(false)
  })
})

describe("crearCapacitacionSchema", () => {
  const base = {
    titulo: "Inducción institucional",
    ambito: "TH",
    iniciaEn: "2026-07-01T14:00:00.000Z",
    terminaEn: "2026-07-01T16:00:00.000Z",
  }
  it("acepta una capacitación válida con metadata mínima", () => {
    expect(crearCapacitacionSchema.safeParse(base).success).toBe(true)
  })
  it("coacciona horas numéricas", () => {
    const r = crearCapacitacionSchema.safeParse({ ...base, horas: "2.5" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.horas).toBe(2.5)
  })
  it("rechaza ámbito inválido", () => {
    expect(crearCapacitacionSchema.safeParse({ ...base, ambito: "RRHH" }).success).toBe(false)
  })
  it("rechaza título demasiado corto tras recortar", () => {
    expect(crearCapacitacionSchema.safeParse({ ...base, titulo: " ab " }).success).toBe(false)
  })
  it("rechaza fechas que no son datetime ISO", () => {
    expect(crearCapacitacionSchema.safeParse({ ...base, iniciaEn: "2026-07-01" }).success).toBe(false)
  })
  it("acepta sin ámbito (TH/SST lo derivan en el backend)", () => {
    const { ambito: _omit, ...sinAmbito } = base
    expect(crearCapacitacionSchema.safeParse(sinAmbito).success).toBe(true)
  })
  it("rechaza un rango invertido (terminaEn <= iniciaEn)", () => {
    expect(
      crearCapacitacionSchema.safeParse({
        ...base,
        iniciaEn: "2026-07-01T16:00:00.000Z",
        terminaEn: "2026-07-01T14:00:00.000Z",
      }).success,
    ).toBe(false)
  })
  it("rechaza inicio y fin idénticos (duración cero)", () => {
    expect(
      crearCapacitacionSchema.safeParse({
        ...base,
        iniciaEn: "2026-07-01T14:00:00.000Z",
        terminaEn: "2026-07-01T14:00:00.000Z",
      }).success,
    ).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    expect(crearCapacitacionSchema.safeParse({ ...base, token: "x" }).success).toBe(false)
  })
})

describe("editarCapacitacionSchema", () => {
  it("acepta una edición parcial (solo título)", () => {
    expect(editarCapacitacionSchema.safeParse({ titulo: "Nuevo título" }).success).toBe(true)
  })
  it("no admite cambiar el ámbito (no está en el schema)", () => {
    expect(editarCapacitacionSchema.safeParse({ ambito: "SST" }).success).toBe(false)
  })
  it("rechaza un cuerpo vacío (PATCH no-op)", () => {
    expect(editarCapacitacionSchema.safeParse({}).success).toBe(false)
  })
  it("acepta editar un solo extremo del rango (lo valida el caso de uso)", () => {
    expect(
      editarCapacitacionSchema.safeParse({ terminaEn: "2026-07-01T18:00:00.000Z" }).success,
    ).toBe(true)
  })
  it("rechaza un rango invertido cuando ambas fechas vienen juntas", () => {
    expect(
      editarCapacitacionSchema.safeParse({
        iniciaEn: "2026-07-01T16:00:00.000Z",
        terminaEn: "2026-07-01T14:00:00.000Z",
      }).success,
    ).toBe(false)
  })
})

describe("registrarAsistenciaSchema (input público)", () => {
  const base = { nombre: "Ana Pérez", documento: "12345", tipoVinculo: "PLANTA" }
  it("acepta datos válidos con correo y dependencia opcionales", () => {
    expect(registrarAsistenciaSchema.safeParse(base).success).toBe(true)
    expect(
      registrarAsistenciaSchema.safeParse({ ...base, correo: "ana@x.co", dependencia: "Sistemas" }).success,
    ).toBe(true)
  })
  it("rechaza nombre demasiado corto", () => {
    expect(registrarAsistenciaSchema.safeParse({ ...base, nombre: "A" }).success).toBe(false)
  })
  it("rechaza tipo de vínculo inválido", () => {
    expect(registrarAsistenciaSchema.safeParse({ ...base, tipoVinculo: "VISITA" }).success).toBe(false)
  })
  it("rechaza correo malformado", () => {
    expect(registrarAsistenciaSchema.safeParse({ ...base, correo: "no-es-correo" }).success).toBe(false)
  })
  it("rechaza claves extra (.strict, defensa anti-inyección)", () => {
    expect(registrarAsistenciaSchema.safeParse({ ...base, usuarioId: "x" }).success).toBe(false)
  })
  it("normaliza el documento (quita puntos/guiones/espacios + mayúsculas)", () => {
    const r = registrarAsistenciaSchema.safeParse({ ...base, documento: "1.234.567" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.documento).toBe("1234567")
    const r2 = registrarAsistenciaSchema.safeParse({ ...base, documento: "abc-123" })
    expect(r2.success).toBe(true)
    if (r2.success) expect(r2.data.documento).toBe("ABC123")
  })
})

describe("filtroCapacitacionesSchema", () => {
  it("acepta ámbito y estado válidos + coacciona paginación", () => {
    const r = filtroCapacitacionesSchema.safeParse({ ambito: "SST", estado: "ABIERTO", pagina: "2" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.pagina).toBe(2)
  })
  it("rechaza estado de registro inválido", () => {
    expect(filtroCapacitacionesSchema.safeParse({ estado: "PUBLICADO" }).success).toBe(false)
  })
})

describe("filtroMiAreaSchema (cola por área con bucket)", () => {
  it("exige areaId UUID", () => {
    expect(filtroMiAreaSchema.safeParse({ areaId: UUID_A }).success).toBe(true)
    expect(filtroMiAreaSchema.safeParse({ areaId: "a1" }).success).toBe(false)
  })
  it("acepta bucket válido y coacciona la paginación", () => {
    const r = filtroMiAreaSchema.safeParse({ areaId: UUID_A, bucket: "pendientes", pagina: "2" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.pagina).toBe(2)
  })
  it("rechaza bucket inválido", () => {
    expect(filtroMiAreaSchema.safeParse({ areaId: UUID_A, bucket: "otros" }).success).toBe(false)
  })
})

describe("crearCursoSchema", () => {
  it("acepta título válido sin ámbito (TH/SST lo derivan del rol)", () => {
    expect(crearCursoSchema.safeParse({ titulo: "Inducción digital" }).success).toBe(true)
  })
  it("acepta ámbito explícito (ruta del SA)", () => {
    expect(crearCursoSchema.safeParse({ titulo: "Inducción digital", ambito: "SST" }).success).toBe(true)
  })
  it("rechaza ámbito inválido", () => {
    expect(
      crearCursoSchema.safeParse({ titulo: "Inducción digital", ambito: "RRHH" }).success,
    ).toBe(false)
  })
  it("rechaza título demasiado corto", () => {
    expect(crearCursoSchema.safeParse({ titulo: "ab" }).success).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    expect(
      crearCursoSchema.safeParse({ titulo: "Inducción digital", token: "x" }).success,
    ).toBe(false)
  })
})

describe("editarCursoSchema", () => {
  it("acepta un patch de un solo campo", () => {
    expect(editarCursoSchema.safeParse({ titulo: "Nuevo título" }).success).toBe(true)
  })
  it("rechaza cuerpo vacío (PATCH no-op)", () => {
    expect(editarCursoSchema.safeParse({}).success).toBe(false)
  })
})

describe("filtroCursosSchema", () => {
  it("acepta ámbito y estado válidos + coacciona paginación", () => {
    const r = filtroCursosSchema.safeParse({ ambito: "TH", estado: "ABIERTO", pagina: "2" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.pagina).toBe(2)
  })
  it("rechaza estado de registro inválido", () => {
    expect(filtroCursosSchema.safeParse({ estado: "PUBLICADO" }).success).toBe(false)
  })
})

describe("crearLeccionSchema (refine cruzado tipoContenido↔contenido)", () => {
  it("acepta una lección de TEXTO con contenidoTexto", () => {
    expect(
      crearLeccionSchema.safeParse({
        titulo: "Lección 1",
        tipoContenido: "TEXTO",
        contenidoTexto: "<p>Hola</p>",
      }).success,
    ).toBe(true)
  })
  it("acepta una lección de VIDEO con urlVideo", () => {
    expect(
      crearLeccionSchema.safeParse({
        titulo: "Lección 1",
        tipoContenido: "VIDEO",
        urlVideo: "https://youtube.com/watch?v=x",
      }).success,
    ).toBe(true)
  })
  it("rechaza una lección de VIDEO sin urlVideo", () => {
    expect(
      crearLeccionSchema.safeParse({ titulo: "Lección 1", tipoContenido: "VIDEO" }).success,
    ).toBe(false)
  })
  it("rechaza una lección de TEXTO sin contenidoTexto", () => {
    expect(
      crearLeccionSchema.safeParse({ titulo: "Lección 1", tipoContenido: "TEXTO" }).success,
    ).toBe(false)
  })
  it("rechaza una urlVideo malformada", () => {
    expect(
      crearLeccionSchema.safeParse({
        titulo: "Lección 1",
        tipoContenido: "VIDEO",
        urlVideo: "no-es-url",
      }).success,
    ).toBe(false)
  })
})

describe("editarLeccionSchema", () => {
  it("rechaza cuerpo vacío (PATCH no-op)", () => {
    expect(editarLeccionSchema.safeParse({}).success).toBe(false)
  })
  it("acepta editar solo el título sin forzar el refine cruzado", () => {
    expect(editarLeccionSchema.safeParse({ titulo: "Nuevo título" }).success).toBe(true)
  })
  it("si tipoContenido viene en el patch, exige el campo de contenido correspondiente", () => {
    expect(
      editarLeccionSchema.safeParse({ tipoContenido: "VIDEO", urlVideo: "https://vimeo.com/1" })
        .success,
    ).toBe(true)
    expect(editarLeccionSchema.safeParse({ tipoContenido: "VIDEO" }).success).toBe(false)
  })
})

describe("ingresarCursoSchema (input público)", () => {
  it("acepta nombre y documento válidos", () => {
    expect(
      ingresarCursoSchema.safeParse({ nombre: "Ana Pérez", documento: "12345" }).success,
    ).toBe(true)
  })
  it("normaliza el documento (quita puntos/guiones/espacios + mayúsculas)", () => {
    const r = ingresarCursoSchema.safeParse({ nombre: "Ana Pérez", documento: "1.234.567" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.documento).toBe("1234567")
  })
  it("rechaza claves extra (.strict, defensa anti-inyección)", () => {
    expect(
      ingresarCursoSchema.safeParse({ nombre: "Ana Pérez", documento: "12345", tipoVinculo: "PLANTA" })
        .success,
    ).toBe(false)
  })
})

describe("crearCapacitacionPlaneadaSchema", () => {
  const base = { titulo: "Plan de inducción", anio: 2026, mes: 7 }
  it("acepta el payload mínimo válido", () => {
    expect(crearCapacitacionPlaneadaSchema.safeParse(base).success).toBe(true)
  })
  it("coacciona anio/mes desde string", () => {
    const r = crearCapacitacionPlaneadaSchema.safeParse({
      ...base,
      anio: "2026",
      mes: "7",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.anio).toBe(2026)
      expect(r.data.mes).toBe(7)
    }
  })
  it("rechaza mes fuera de rango", () => {
    expect(crearCapacitacionPlaneadaSchema.safeParse({ ...base, mes: 13 }).success).toBe(false)
  })
  it("rechaza año fuera de rango", () => {
    expect(crearCapacitacionPlaneadaSchema.safeParse({ ...base, anio: 1999 }).success).toBe(false)
  })
})

describe("editarCapacitacionPlaneadaSchema", () => {
  it("acepta un patch de un solo campo (estado)", () => {
    expect(editarCapacitacionPlaneadaSchema.safeParse({ estado: "EN_CURSO" }).success).toBe(true)
  })
  it("rechaza cuerpo vacío (PATCH no-op)", () => {
    expect(editarCapacitacionPlaneadaSchema.safeParse({}).success).toBe(false)
  })
  it("rechaza estado inválido", () => {
    expect(editarCapacitacionPlaneadaSchema.safeParse({ estado: "FINALIZADA" }).success).toBe(false)
  })
})

describe("filtroCapacitacionesPlaneadasSchema", () => {
  it("acepta filtros válidos + coacciona año/mes/paginación", () => {
    const r = filtroCapacitacionesPlaneadasSchema.safeParse({
      anio: "2026",
      mes: "7",
      estado: "PLANEADA",
      pagina: "1",
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.anio).toBe(2026)
      expect(r.data.mes).toBe(7)
    }
  })
  it("rechaza estado inválido", () => {
    expect(filtroCapacitacionesPlaneadasSchema.safeParse({ estado: "PAUSADA" }).success).toBe(false)
  })
})
