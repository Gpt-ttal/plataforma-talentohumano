import { describe, it, expect } from "vitest"
import {
  calcularDashboardVacantes,
  calcularStatusVacante,
  calcularVencimientoVacante,
  derivarVacante,
  diasEntreFechas,
  diasParaVencerVacante,
  esCedulaValida,
  evaluarFila,
  sumarMesesFecha,
  tieneBloqueoVacante,
  tipoVinculacionDesdeDedicacion,
  type Vacante,
  type VacanteConNombreArea,
} from "../src/vacantes"

const HOY = "2026-07-23"

function vacanteBase(overrides: Partial<Vacante> = {}): Vacante {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    requerimiento: "REQ-0001",
    cargo: "Analista de Nómina",
    posiciones: 1,
    areaId: "22222222-2222-4222-8222-222222222222",
    modalidad: "PRESENCIAL",
    dedicacion: "TIEMPO_COMPLETO",
    escalafon: null,
    motivo: "NUEVO_CARGO",
    fuente: null,
    jefe: "María Gómez",
    reemplazo: null,
    nombreNuevo: null,
    salario: 3_000_000,
    aprobacion: "APROBADO",
    fechaAprobacion: null,
    fechaRequerimiento: "2026-06-10",
    fase: "RECLUTAMIENTO",
    estado: "PENDIENTE",
    fechaContratacion: null,
    cedula: null,
    createdAt: "2026-06-10T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    ...overrides,
  }
}

describe("sumarMesesFecha (semántica EDATE)", () => {
  it("suma un mes en el caso normal", () => {
    expect(sumarMesesFecha("2026-06-10", 1)).toBe("2026-07-10")
  })
  it("fija fin de mes cuando el mes destino es más corto", () => {
    expect(sumarMesesFecha("2026-01-31", 1)).toBe("2026-02-28")
  })
})

describe("diasEntreFechas", () => {
  it("es positivo cuando b es posterior a a", () => {
    expect(diasEntreFechas("2026-07-01", "2026-07-10")).toBe(9)
  })
  it("es negativo cuando b es anterior a a", () => {
    expect(diasEntreFechas("2026-07-10", "2026-07-01")).toBe(-9)
  })
})

describe("calcularVencimientoVacante / diasParaVencerVacante", () => {
  it("vencimiento = requerimiento + 1 mes calendario", () => {
    expect(calcularVencimientoVacante("2026-06-10")).toBe("2026-07-10")
  })
  it("diasParaVencer es null para una vacante CONTRATADO", () => {
    expect(diasParaVencerVacante("2026-07-10", "CONTRATADO", HOY)).toBeNull()
  })
  it("diasParaVencer negativo cuando ya venció", () => {
    expect(diasParaVencerVacante("2026-07-10", "PENDIENTE", HOY)).toBeLessThan(0)
  })
})

describe("calcularStatusVacante", () => {
  it("CONTRATADO -> CUBIERTA", () => {
    expect(calcularStatusVacante("CONTRATADO", "2026-07-10", HOY)).toBe("CUBIERTA")
  })
  it("estados cerrados -> CERRADA", () => {
    expect(calcularStatusVacante("CANCELADA", "2026-07-10", HOY)).toBe("CERRADA")
    expect(calcularStatusVacante("PAUSADA", "2026-07-10", HOY)).toBe("CERRADA")
    expect(calcularStatusVacante("CERRADA_PROMOCION", "2026-07-10", HOY)).toBe("CERRADA")
  })
  it("sin fecha de vencimiento -> null", () => {
    expect(calcularStatusVacante("PENDIENTE", null, HOY)).toBeNull()
  })
  it("hoy después del vencimiento -> VENCIDA", () => {
    expect(calcularStatusVacante("PENDIENTE", "2026-07-10", HOY)).toBe("VENCIDA")
  })
  it("hoy antes del vencimiento -> VIGENTE", () => {
    expect(calcularStatusVacante("PENDIENTE", "2026-08-10", HOY)).toBe("VIGENTE")
  })
})

describe("esCedulaValida", () => {
  it("acepta cédulas entre 6 y 10 dígitos", () => {
    expect(esCedulaValida("123456")).toBe(true)
    expect(esCedulaValida("1234567890")).toBe(true)
  })
  it("rechaza cédulas fuera de rango", () => {
    expect(esCedulaValida("12345")).toBe(false)
    expect(esCedulaValida("12345678901")).toBe(false)
  })
})

describe("derivarVacante", () => {
  it("calcula vencimiento, días y STATUS de una vacante vigente", () => {
    const v = vacanteBase({ fechaRequerimiento: "2026-07-01" })
    const d = derivarVacante(v, HOY)
    expect(d.fechaVencimiento).toBe("2026-08-01")
    expect(d.status).toBe("VIGENTE")
    expect(d.diasParaVencer).toBeGreaterThan(0)
    expect(d.avisos).toEqual([])
  })

  it("una vacante vencida y aún en Reclutamiento genera AVISO tras el umbral", () => {
    const v = vacanteBase({ fechaRequerimiento: "2026-05-01" }) // venc: 2026-06-01, muy vencida
    const d = derivarVacante(v, HOY)
    expect(d.status).toBe("VENCIDA")
    expect(d.avisos.some((h) => h.campo === "status")).toBe(true)
  })

  it("nunca incluye BLOQUEOs en avisos", () => {
    const v = vacanteBase({ estado: "CONTRATADO", cedula: null, nombreNuevo: null, fechaContratacion: null })
    const d = derivarVacante(v, HOY)
    expect(d.avisos.every((h) => h.severidad === "AVISO")).toBe(true)
  })
})

describe("evaluarFila — BLOQUEOs", () => {
  it("CONTRATADO sin cédula/nombre/fecha genera 3 bloqueos", () => {
    const v = vacanteBase({ estado: "CONTRATADO", cedula: null, nombreNuevo: null, fechaContratacion: null })
    const hallazgos = evaluarFila(v, HOY)
    const bloqueos = hallazgos.filter((h) => h.severidad === "BLOQUEO")
    expect(bloqueos.map((h) => h.campo).sort()).toEqual(["cedula", "fechaContratacion", "nombreNuevo"])
    expect(tieneBloqueoVacante(hallazgos)).toBe(true)
  })

  it("cédula con formato inválido es BLOQUEO", () => {
    const v = vacanteBase({ cedula: "123" })
    const hallazgos = evaluarFila(v, HOY)
    expect(hallazgos).toContainEqual(
      expect.objectContaining({ campo: "cedula", severidad: "BLOQUEO" }),
    )
  })

  it("fecha de contratación anterior a la de requerimiento es BLOQUEO", () => {
    const v = vacanteBase({ fechaRequerimiento: "2026-07-10", fechaContratacion: "2026-07-01" })
    const hallazgos = evaluarFila(v, HOY)
    expect(hallazgos).toContainEqual(
      expect.objectContaining({ campo: "fechaContratacion", severidad: "BLOQUEO" }),
    )
  })

  it("posiciones no entero o menor al mínimo es BLOQUEO", () => {
    const v = vacanteBase({ posiciones: 0 })
    const hallazgos = evaluarFila(v, HOY)
    expect(hallazgos).toContainEqual(
      expect.objectContaining({ campo: "posiciones", severidad: "BLOQUEO" }),
    )
  })

  it("CONTRATADO sin área es BLOQUEO (no se puede crear el funcionario sin área)", () => {
    // El puente Vacante→Funcionario copia el área a `funcionarios.area_origen`
    // (NOT NULL); sin área no hay a dónde ingresar a la persona. Ver ADR-0009.
    const v = vacanteBase({
      estado: "CONTRATADO",
      areaId: null,
      cedula: "123456",
      nombreNuevo: "Juan Pérez",
      fechaContratacion: "2026-07-15",
    })
    const hallazgos = evaluarFila(v, HOY)
    expect(hallazgos).toContainEqual(
      expect.objectContaining({ campo: "areaId", severidad: "BLOQUEO" }),
    )
    // No debe duplicarse como AVISO cuando ya es un BLOQUEO.
    expect(hallazgos).not.toContainEqual(
      expect.objectContaining({ campo: "areaId", severidad: "AVISO" }),
    )
    expect(tieneBloqueoVacante(hallazgos)).toBe(true)
  })

  it("una vacante bien formada no genera bloqueos", () => {
    const v = vacanteBase()
    expect(tieneBloqueoVacante(evaluarFila(v, HOY))).toBe(false)
  })
})

describe("evaluarFila — AVISOs", () => {
  it("PENDIENTE con fecha de contratación genera AVISO", () => {
    const v = vacanteBase({ estado: "PENDIENTE", fechaContratacion: "2026-07-01" })
    expect(evaluarFila(v, HOY)).toContainEqual(
      expect.objectContaining({ campo: "fechaContratacion", severidad: "AVISO" }),
    )
  })

  it("dedicación Administrativo sin salario genera AVISO", () => {
    const v = vacanteBase({ dedicacion: "ADMINISTRATIVO", salario: null })
    expect(evaluarFila(v, HOY)).toContainEqual(
      expect.objectContaining({ campo: "salario", severidad: "AVISO" }),
    )
  })

  it("fase avanzada sin aprobación genera AVISO", () => {
    const v = vacanteBase({ fase: "EXAMEN_MEDICO", aprobacion: "EN_REVISION" })
    expect(evaluarFila(v, HOY)).toContainEqual(
      expect.objectContaining({ campo: "aprobacion", severidad: "AVISO" }),
    )
  })

  it("sin área genera AVISO", () => {
    const v = vacanteBase({ areaId: null })
    expect(evaluarFila(v, HOY)).toContainEqual(
      expect.objectContaining({ campo: "areaId", severidad: "AVISO" }),
    )
  })

  it("sin jefe inmediato genera AVISO", () => {
    const v = vacanteBase({ jefe: null })
    expect(evaluarFila(v, HOY)).toContainEqual(
      expect.objectContaining({ campo: "jefe", severidad: "AVISO" }),
    )
  })

  it("CONTRATADO con área NO genera el AVISO de área (queda cubierto por el flujo feliz)", () => {
    const v = vacanteBase({
      estado: "CONTRATADO",
      cedula: "123456",
      nombreNuevo: "Juan Pérez",
      fechaContratacion: "2026-07-15",
    })
    expect(evaluarFila(v, HOY)).not.toContainEqual(
      expect.objectContaining({ campo: "areaId" }),
    )
  })
})

describe("tipoVinculacionDesdeDedicacion (mapeo Vacante→Funcionario, ADR-0009)", () => {
  it("las cuatro dedicaciones docentes mapean a DOCENTE", () => {
    for (const d of ["TIEMPO_COMPLETO", "MEDIO_TIEMPO", "CATEDRATICO", "TUTOR"]) {
      expect(tipoVinculacionDesdeDedicacion(d)).toBe("DOCENTE")
    }
  })

  it("ADMINISTRATIVO y OPS mapean a sí mismos", () => {
    expect(tipoVinculacionDesdeDedicacion("ADMINISTRATIVO")).toBe("ADMINISTRATIVO")
    expect(tipoVinculacionDesdeDedicacion("OPS")).toBe("OPS")
  })

  it("dedicación ausente o desconocida → null (TH la clasifica luego)", () => {
    expect(tipoVinculacionDesdeDedicacion(null)).toBeNull()
    expect(tipoVinculacionDesdeDedicacion("")).toBeNull()
    expect(tipoVinculacionDesdeDedicacion("OTRA_COSA")).toBeNull()
  })
})

describe("calcularDashboardVacantes", () => {
  function derivada(overrides: Partial<Vacante> = {}, areaNombre: string | null = "Sistemas"): VacanteConNombreArea {
    const v = vacanteBase(overrides)
    return { ...derivarVacante(v, HOY), areaNombre }
  }

  it("calcula los 7 KPIs sobre un conjunto simple", () => {
    const vacantes: VacanteConNombreArea[] = [
      derivada({ id: "a", cargo: "Analista", estado: "PENDIENTE", fechaRequerimiento: "2026-07-01" }),
      derivada({
        id: "b",
        cargo: "Analista", // mismo cargo -> cuenta 1 solo en totalPosiciones
        estado: "CONTRATADO",
        cedula: "123456",
        nombreNuevo: "Juan Pérez",
        fechaContratacion: "2026-07-15",
        fechaRequerimiento: "2026-06-01",
      }),
      derivada({ id: "c", cargo: "Auxiliar", estado: "PENDIENTE", fechaRequerimiento: "2026-05-01" }), // vencida
    ]
    const { kpis } = calcularDashboardVacantes(vacantes, HOY)
    expect(kpis.totalVacantes).toBe(3)
    expect(kpis.totalPosiciones).toBe(2) // cargos únicos: Analista, Auxiliar
    expect(kpis.vacantesActivas).toBe(2) // las dos PENDIENTE
    expect(kpis.vacantesVencidas).toBeGreaterThanOrEqual(1)
    expect(kpis.diasPromedioContratacion).toBeGreaterThan(0)
  })

  it("agrupa las 6 series por dimensión", () => {
    const vacantes: VacanteConNombreArea[] = [
      derivada({ id: "a", estado: "PENDIENTE", fase: "RECLUTAMIENTO", motivo: "NUEVO_CARGO" }, "Sistemas"),
      derivada(
        {
          id: "b",
          estado: "CONTRATADO",
          cedula: "123456",
          nombreNuevo: "Juan Pérez",
          fechaContratacion: "2026-07-15",
          fuente: "REFERIDO",
        },
        "Sistemas",
      ),
    ]
    const { series } = calcularDashboardVacantes(vacantes, HOY)
    expect(series.porArea).toContainEqual({ label: "Sistemas", total: 2 })
    expect(series.porMotivo).toContainEqual({ label: "NUEVO_CARGO", total: 2 })
    expect(series.fuentesContratados).toContainEqual({ label: "REFERIDO", total: 1 })
    expect(series.contratacionesPorMes).toContainEqual({ label: "2026-07", total: 1 })
    expect(series.porFase.length).toBeGreaterThan(0)
    expect(series.porStatus.length).toBeGreaterThan(0)
  })

  it("no revienta con un conjunto vacío", () => {
    const { kpis, series } = calcularDashboardVacantes([], HOY)
    expect(kpis.totalVacantes).toBe(0)
    expect(kpis.diasPromedioContratacion).toBe(0)
    expect(kpis.pctAprobacionPendiente).toBe(0)
    expect(series.porArea).toEqual([])
  })
})
