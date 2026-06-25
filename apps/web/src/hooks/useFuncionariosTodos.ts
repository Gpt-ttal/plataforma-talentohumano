import { useQuery } from "@tanstack/react-query"
import type { Funcionario } from "@pys/shared"
import { apiFuncionarios } from "../lib/api"

// Tope del backend (`filtroFuncionariosSchema.porPagina` ≤ 100).
const POR_PAGINA = 100

/**
 * Trae TODOS los funcionarios para los desgloses del Panel de control (por cargo,
 * por área de origen y el filtro por rango de fecha de retiro). El endpoint está
 * paginado y topado en 100/página, así que paginamos en bucle: pedimos la página
 * 1, leemos `totalPaginas` y, si hay más, traemos el resto en paralelo y
 * concatenamos. Al volumen actual es 1 request; para cientos, 2-3.
 *
 * Si el volumen creciera mucho, evolucionar a un endpoint de agregación dedicado
 * (Enfoque B) — fuera de alcance por ahora.
 */
async function traerTodos(): Promise<Funcionario[]> {
  const primera = await apiFuncionarios.listar({ pagina: 1, porPagina: POR_PAGINA })
  if (primera.totalPaginas <= 1) return primera.items

  const restantes = await Promise.all(
    Array.from({ length: primera.totalPaginas - 1 }, (_, i) =>
      apiFuncionarios.listar({ pagina: i + 2, porPagina: POR_PAGINA }),
    ),
  )
  return [primera, ...restantes].flatMap((p) => p.items)
}

/**
 * Lista completa de funcionarios, cacheada aparte de la lista paginada del
 * catálogo. `enabled` permite no dispararla hasta que el Panel la necesite.
 */
export function useFuncionariosTodos(opciones: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["funcionarios-todos"],
    queryFn: traerTodos,
    enabled: opciones.enabled ?? true,
    staleTime: 60_000,
  })
}
