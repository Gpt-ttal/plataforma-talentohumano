/**
 * metricas.ts — Agregaciones puras del Panel de control, derivadas de la lista
 * de funcionarios. Sin I/O ni dependencias de framework (estilo `estado.ts`),
 * para poder segmentar/totalizar en el front sin endpoints nuevos.
 *
 * `pendientesPorArea` NO vive aquí: depende de las aprobaciones, que sólo el
 * backend conoce (`/metricas`). Estas funciones cubren lo que SÍ es derivable de
 * un `Funcionario[]`: distribución por estado, antigüedad (aging), agrupación
 * por cargo/área de origen y filtro por rango de fecha de retiro.
 */

import type { EstadoGlobal, Funcionario } from "./domain.js";
import { ESTADOS_GLOBAL } from "./domain.js";

/** Conteos de antigüedad del proceso por fecha de retiro. */
export interface Aging {
  atrasados: number;
  proximos: number;
  masAdelante: number;
  sinFecha: number;
}

/** Par clave→conteo, ya ordenado, para barras de un desglose. */
export interface GrupoConteo {
  clave: string;
  valor: number;
}

const DIA = 24 * 60 * 60 * 1000;

/** Conteo por estado global, con todas las claves inicializadas en 0. */
export function agregarPorEstado(
  funcionarios: readonly Funcionario[],
): Record<EstadoGlobal, number> {
  const acc = ESTADOS_GLOBAL.reduce(
    (a, e) => ({ ...a, [e]: 0 }),
    {} as Record<EstadoGlobal, number>,
  );
  for (const f of funcionarios) acc[f.estadoGlobal] += 1;
  return acc;
}

/**
 * Antigüedad del proceso por fecha de retiro. Replica VERBATIM la regla de
 * `funcionarioRepository.obtenerMetricas` — ésta es la definición única de la
 * regla en el front:
 *  · Excluye trámites ya resueltos (LIQUIDACION_GENERADA / PAZ_Y_SALVO).
 *  · Sin fecha (o fecha no parseable) → `sinFecha`.
 *  · Compara contra el inicio (UTC) del día `hoy`: < hoy → atrasados;
 *    ≤ hoy+7d → próximos; resto → másAdelante.
 */
export function calcularAging(
  funcionarios: readonly Funcionario[],
  hoy: Date = new Date(),
): Aging {
  const inicioHoy = Date.UTC(
    hoy.getUTCFullYear(),
    hoy.getUTCMonth(),
    hoy.getUTCDate(),
  );
  const aging: Aging = { atrasados: 0, proximos: 0, masAdelante: 0, sinFecha: 0 };

  for (const f of funcionarios) {
    if (
      f.estadoGlobal === "LIQUIDACION_GENERADA" ||
      f.estadoGlobal === "PAZ_Y_SALVO"
    )
      continue;

    if (!f.fechaRetiro) {
      aging.sinFecha += 1;
      continue;
    }
    const t = Date.parse(`${f.fechaRetiro}T00:00:00.000Z`);
    if (Number.isNaN(t)) aging.sinFecha += 1;
    else if (t < inicioHoy) aging.atrasados += 1;
    else if (t <= inicioHoy + 7 * DIA) aging.proximos += 1;
    else aging.masAdelante += 1;
  }
  return aging;
}

/**
 * Agrupa funcionarios por un campo de texto (cargo o área de origen) y devuelve
 * los conteos de mayor a menor (desempate alfabético es-CO). Las claves vacías
 * caen en "Sin dato".
 */
export function agruparPorCampo(
  funcionarios: readonly Funcionario[],
  campo: "cargo" | "areaOrigen",
): GrupoConteo[] {
  const mapa = new Map<string, number>();
  for (const f of funcionarios) {
    const clave = (f[campo] ?? "").trim() || "Sin dato";
    mapa.set(clave, (mapa.get(clave) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([clave, valor]) => ({ clave, valor }))
    .sort((a, b) => b.valor - a.valor || a.clave.localeCompare(b.clave, "es"));
}

/**
 * Filtra por rango (inclusivo) de fecha de retiro "yyyy-mm-dd". `desde`/`hasta`
 * son límites opcionales; la comparación lexicográfica es correcta por el formato
 * ISO. Sin límites devuelve una copia. Con algún límite activo, un funcionario
 * sin fecha queda fuera (un rango implica "con fecha dentro del rango").
 */
export function filtrarPorRangoRetiro(
  funcionarios: readonly Funcionario[],
  desde?: string,
  hasta?: string,
): Funcionario[] {
  if (!desde && !hasta) return [...funcionarios];
  return funcionarios.filter((f) => {
    if (!f.fechaRetiro) return false;
    if (desde && f.fechaRetiro < desde) return false;
    if (hasta && f.fechaRetiro > hasta) return false;
    return true;
  });
}
