import { QueryClient } from "@tanstack/react-query"

/**
 * QueryClient compartido. `staleTime` corto (datos de trámite que cambian con las
 * acciones) y sin refetch al enfocar la ventana para no recargar al alternar apps.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
