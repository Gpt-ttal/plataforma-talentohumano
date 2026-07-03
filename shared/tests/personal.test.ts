import { describe, it, expect } from "vitest"
import {
  estadoVinculacion,
  calcularEdad,
  calcularAntiguedad,
  grupoEtario,
  rangoSalarial,
} from "../src/personal"
import {
  crearEmpleadoSchema,
  editarEmpleadoSchema,
  finalizarContratoSchema,
  registrarNovedadSchema,
  filtroEmpleadosSchema,
  editarContractualSchema,
  guardarPersonalesSchema,
  crearFamiliarSchema,
  crearFormacionSchema,
  crearExperienciaSchema,
  guardarSalarialSchema,
} from "../src/schemas"

describe("estadoVinculacion (ciclo de vida derivado)", () => {
  it("sin fecha de retiro → ACTIVO (aunque estadoGlobal sea PENDIENTE)", () => {
    expect(
      estadoVinculacion({ fechaRetiro: null, estadoGlobal: "PENDIENTE" }),
    ).toBe("ACTIVO")
  })
  it("con fecha de retiro y trámite abierto → EN_RETIRO", () => {
    expect(
      estadoVinculacion({
        fechaRetiro: "2026-08-01",
        estadoGlobal: "LISTO_PARA_LIQUIDAR",
      }),
    ).toBe("EN_RETIRO")
  })
  it("trámite cerrado (PAZ_Y_SALVO) → RETIRADO", () => {
    expect(
      estadoVinculacion({ fechaRetiro: "2026-08-01", estadoGlobal: "PAZ_Y_SALVO" }),
    ).toBe("RETIRADO")
  })
})

describe("crearEmpleadoSchema", () => {
  const base = {
    documento: "1234567",
    nombreCompleto: "Pérez López Ana",
    tipoVinculacion: "ADMINISTRATIVO",
    cargo: "Analista",
    areaOrigen: "Talento Humano",
  }
  it("acepta el núcleo mínimo con tipo de vinculación", () => {
    expect(crearEmpleadoSchema.safeParse(base).success).toBe(true)
  })
  it("exige tipoVinculacion", () => {
    const { tipoVinculacion, ...sinTipo } = base
    expect(crearEmpleadoSchema.safeParse(sinTipo).success).toBe(false)
  })
  it("rechaza claves extra (.strict)", () => {
    expect(crearEmpleadoSchema.safeParse({ ...base, salario: 5 }).success).toBe(
      false,
    )
  })
  it("rechaza fecha con formato inválido", () => {
    expect(
      crearEmpleadoSchema.safeParse({ ...base, fechaIngreso: "01/2026" }).success,
    ).toBe(false)
  })
})

describe("editarEmpleadoSchema", () => {
  it("rechaza el cuerpo vacío (PATCH no-op)", () => {
    expect(editarEmpleadoSchema.safeParse({}).success).toBe(false)
  })
  it("acepta un solo campo", () => {
    expect(editarEmpleadoSchema.safeParse({ cargo: "Coordinadora" }).success).toBe(
      true,
    )
  })
  it("permite null para borrar un opcional", () => {
    expect(
      editarEmpleadoSchema.safeParse({ fechaFinContrato: null }).success,
    ).toBe(true)
  })
  it("no permite editar el documento (identidad)", () => {
    expect(editarEmpleadoSchema.safeParse({ documento: "999" }).success).toBe(
      false,
    )
  })
})

describe("finalizarContratoSchema", () => {
  it("exige una fecha de retiro válida", () => {
    expect(
      finalizarContratoSchema.safeParse({ fechaRetiro: "2026-09-15" }).success,
    ).toBe(true)
    expect(finalizarContratoSchema.safeParse({}).success).toBe(false)
  })
})

describe("registrarNovedadSchema (unión discriminada por tipo)", () => {
  it("CAMBIO_CARGO exige nuevoCargo", () => {
    expect(
      registrarNovedadSchema.safeParse({
        tipo: "CAMBIO_CARGO",
        motivo: "Promoción",
        nuevoCargo: "Jefe",
      }).success,
    ).toBe(true)
    expect(
      registrarNovedadSchema.safeParse({ tipo: "CAMBIO_CARGO", motivo: "x" })
        .success,
    ).toBe(false)
  })
  it("EXTENSION_CONTRATO exige nuevaFechaFin y rechaza campos de la otra variante", () => {
    expect(
      registrarNovedadSchema.safeParse({
        tipo: "EXTENSION_CONTRATO",
        motivo: "Prórroga",
        nuevaFechaFin: "2027-01-31",
      }).success,
    ).toBe(true)
    expect(
      registrarNovedadSchema.safeParse({
        tipo: "EXTENSION_CONTRATO",
        motivo: "Prórroga",
        nuevoCargo: "Jefe",
      }).success,
    ).toBe(false)
  })
})

describe("filtroEmpleadosSchema", () => {
  it("coacciona paginación y valida enums", () => {
    const r = filtroEmpleadosSchema.safeParse({
      q: "ana",
      tipoVinculacion: "DOCENTE",
      vinculoEstado: "ACTIVO",
      pagina: "2",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.pagina).toBe(2)
  })
  it("rechaza un estado de vinculación inexistente", () => {
    expect(
      filtroEmpleadosSchema.safeParse({ vinculoEstado: "JUBILADO" }).success,
    ).toBe(false)
  })
})

// ── Hoja de vida 360° ────────────────────────────────────────────────────────

describe("campos derivados (calcular, no persistir)", () => {
  const hoy = new Date("2026-07-01T12:00:00Z")
  it("calcularEdad: años completos según mes/día", () => {
    expect(calcularEdad("1990-01-01", hoy)).toBe(36)
    expect(calcularEdad("1990-12-31", hoy)).toBe(35) // aún no cumple
    expect(calcularEdad(null, hoy)).toBeNull()
    expect(calcularEdad("basura", hoy)).toBeNull()
  })
  it("calcularAntiguedad desde el ingreso", () => {
    expect(calcularAntiguedad("2019-03-04", hoy)).toBe(7)
    expect(calcularAntiguedad(null, hoy)).toBeNull()
  })
  it("grupoEtario ubica la edad en su banda", () => {
    expect(grupoEtario(24)).toBe("18-25")
    expect(grupoEtario(36)).toBe("36-45")
    expect(grupoEtario(60)).toBe("56+")
    expect(grupoEtario(null)).toBeNull()
  })
  it("rangoSalarial en SMMLV", () => {
    expect(rangoSalarial(1_423_500)).toBe("1-2 SMMLV")
    expect(rangoSalarial(5_000_000)).toBe("2-4 SMMLV") // 3.5 SMMLV
    expect(rangoSalarial(7_000_000)).toBe("4-6 SMMLV") // 4.9 SMMLV
    expect(rangoSalarial(0)).toBeNull()
    expect(rangoSalarial(null)).toBeNull()
  })
})

describe("editarContractualSchema", () => {
  it("acepta un subconjunto y rechaza el cuerpo vacío", () => {
    expect(editarContractualSchema.safeParse({ modalidad: "HIBRIDO" }).success).toBe(
      true,
    )
    expect(editarContractualSchema.safeParse({}).success).toBe(false)
  })
  it("valida areaId como uuid y rechaza claves extra (.strict)", () => {
    expect(editarContractualSchema.safeParse({ areaId: "no-uuid" }).success).toBe(
      false,
    )
    expect(
      editarContractualSchema.safeParse({ modalidad: "VIRTUAL", extra: 1 }).success,
    ).toBe(false)
  })
  it("permite null para borrar un opcional", () => {
    expect(editarContractualSchema.safeParse({ escalafon: null }).success).toBe(true)
  })
})

describe("guardarPersonalesSchema", () => {
  it("valida correo y género", () => {
    expect(
      guardarPersonalesSchema.safeParse({
        genero: "FEMENINO",
        correoPersonal: "ana@mail.com",
      }).success,
    ).toBe(true)
    expect(
      guardarPersonalesSchema.safeParse({ correoPersonal: "no-mail" }).success,
    ).toBe(false)
    expect(guardarPersonalesSchema.safeParse({ genero: "X" }).success).toBe(false)
  })
})

describe("crearFamiliarSchema", () => {
  it("exige parentesco y nombre", () => {
    expect(
      crearFamiliarSchema.safeParse({ parentesco: "HIJO", nombre: "Samuel" }).success,
    ).toBe(true)
    expect(crearFamiliarSchema.safeParse({ parentesco: "HIJO" }).success).toBe(false)
    expect(
      crearFamiliarSchema.safeParse({ parentesco: "AMIGO", nombre: "X" }).success,
    ).toBe(false)
  })
})

describe("crearFormacionSchema", () => {
  it("rechaza anioFin anterior a anioInicio", () => {
    expect(
      crearFormacionSchema.safeParse({
        nivel: "MAESTRIA",
        titulo: "Ciencia de Datos",
        anioInicio: 2016,
        anioFin: 2014,
      }).success,
    ).toBe(false)
    expect(
      crearFormacionSchema.safeParse({
        nivel: "DOCTORADO",
        titulo: "Ingeniería",
        anioInicio: 2016,
        anioFin: 2019,
      }).success,
    ).toBe(true)
  })
})

describe("crearExperienciaSchema", () => {
  it("rechaza fechaFin anterior a fechaInicio", () => {
    expect(
      crearExperienciaSchema.safeParse({
        empresa: "Uninorte",
        cargo: "Docente",
        fechaInicio: "2019-01-01",
        fechaFin: "2014-01-01",
      }).success,
    ).toBe(false)
  })
})

describe("guardarSalarialSchema", () => {
  it("acepta montos y rechaza negativos / cuerpo vacío", () => {
    expect(
      guardarSalarialSchema.safeParse({ salarioBasico: 3_500_000, eps: "Sura" })
        .success,
    ).toBe(true)
    expect(guardarSalarialSchema.safeParse({ salarioBasico: -1 }).success).toBe(false)
    expect(guardarSalarialSchema.safeParse({}).success).toBe(false)
  })
  it("permite honorarios sin salario (caso OPS)", () => {
    expect(guardarSalarialSchema.safeParse({ honorarios: 2_000_000 }).success).toBe(
      true,
    )
  })
})
