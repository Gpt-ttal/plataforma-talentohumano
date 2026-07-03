import type {
  AreaVistoBueno,
  AsignarRolInput,
  BucketGestion,
  CambiarEstadoAreaInput,
  CambiarEstadoUsuarioInput,
  Capacitacion,
  CapacitacionDetalle,
  CapacitacionPublica,
  ColaGestionArea,
  CrearEmpleadoInput,
  CrearExperienciaInput,
  CrearFamiliarInput,
  CrearFormacionInput,
  DatosPersonales,
  DatosSalariales,
  EditarContractualInput,
  EditarEmpleadoInput,
  Empleado,
  EmpleadoContractual,
  EmpleadoDetalle,
  Experiencia,
  ExpedienteCompleto,
  Familiar,
  FiltroArchivo,
  FiltroCapacitaciones,
  FiltroEmpleados,
  FiltroFuncionarios,
  Formacion,
  Funcionario,
  FuncionarioDetalle,
  GuardarPersonalesInput,
  GuardarSalarialInput,
  MatrizGestion,
  MetricasDashboard,
  RegistrarAsistenciaInput,
  RegistrarNovedadInput,
  ResultadoMutacion,
  ResultadoPaginado,
  ResultadoRegistro,
  Usuario,
} from "@pys/shared"
import { supabase } from "./supabase"

/**
 * Error de API con el código HTTP. El frontend lo usa para reflejar 401/403/400
 * en la UX (la decisión real ya la tomó el backend).
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

const BASE = import.meta.env.VITE_API_URL ?? "/api"

/** Serializa un objeto a query-string omitiendo vacíos/undefined. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== "") sp.set(clave, String(valor))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    // 401 = sesión inválida/expirada (no 403, que es "sin permiso"): se cierra la
    // sesión local; `onAuthStateChange` del AuthContext deja `usuario=null` y el
    // guard reenvía a /login en vez de mostrar un error de página.
    if (res.status === 401) {
      await supabase.auth.signOut().catch(() => {})
    }
    throw new ApiError(res.status, payload.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * Descarga un recurso binario (p. ej. CSV) con el mismo Bearer que `request`.
 * Devuelve el `Blob` para que el llamador dispare la descarga en el navegador.
 */
async function requestBlob(path: string): Promise<Blob> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) {
    if (res.status === 401) {
      await supabase.auth.signOut().catch(() => {})
    }
    const payload = (await res.json().catch(() => ({}))) as { error?: string }
    throw new ApiError(res.status, payload.error ?? res.statusText)
  }
  return res.blob()
}

/** Cliente HTTP base: adjunta el JWT de Supabase y normaliza errores. */
export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  blob: (path: string) => requestBlob(path),
}

// ── Endpoints tipados (las formas coinciden con los casos de uso del backend) ──

export const apiAuth = {
  me: () => api.get<Usuario>("/auth/me"),
}

export const apiFuncionarios = {
  listar: (filtro: FiltroFuncionarios = {}) =>
    api.get<ResultadoPaginado<Funcionario>>(
      `/funcionarios${qs({
        q: filtro.q,
        estado: filtro.estado,
        pagina: filtro.pagina,
        porPagina: filtro.porPagina,
      })}`,
    ),
  matriz: (filtro: FiltroFuncionarios = {}) =>
    api.get<MatrizGestion>(
      `/funcionarios/matriz${qs({
        q: filtro.q,
        estado: filtro.estado,
        pagina: filtro.pagina,
        porPagina: filtro.porPagina,
      })}`,
    ),
  detalle: (id: string) => api.get<FuncionarioDetalle>(`/funcionarios/${id}`),
  cambiarEstadoArea: (input: CambiarEstadoAreaInput) =>
    api.post<ResultadoMutacion>(
      `/funcionarios/${input.funcionarioId}/areas/${input.areaId}/estado`,
      { estado: input.estado, observacion: input.observacion },
    ),
  generarLiquidacion: (id: string) =>
    api.post<ResultadoMutacion>(`/funcionarios/${id}/liquidacion`),
  registrarPazYSalvo: (id: string) =>
    api.post<ResultadoMutacion>(`/funcionarios/${id}/paz-y-salvo`),
}

export const apiMiArea = {
  listar: (
    areaId: string,
    opciones: { pagina?: number; bucket?: BucketGestion } = {},
  ) =>
    api.get<ColaGestionArea>(
      `/mi-area${qs({ areaId, pagina: opciones.pagina, bucket: opciones.bucket })}`,
    ),
}

export const apiAreas = {
  listar: () => api.get<AreaVistoBueno[]>("/areas"),
  /** Vista de administración: incluye las inactivas (solo SUPERADMIN). */
  listarAdmin: () => api.get<AreaVistoBueno[]>("/areas?incluirInactivas=1"),
  // Las mutaciones devuelven el catálogo completo actualizado (orden incluido).
  crear: (nombre: string) => api.post<AreaVistoBueno[]>("/areas", { nombre }),
  renombrar: (id: string, nombre: string) =>
    api.post<AreaVistoBueno[]>(`/areas/${id}/nombre`, { nombre }),
  mover: (id: string, direccion: "subir" | "bajar") =>
    api.post<AreaVistoBueno[]>(`/areas/${id}/mover`, { direccion }),
  cambiarActiva: (id: string, activa: boolean) =>
    api.post<AreaVistoBueno[]>(`/areas/${id}/activa`, { activa }),
}

export const apiMetricas = {
  obtener: () => api.get<MetricasDashboard>("/metricas"),
}

export const apiArchivo = {
  listar: (filtro: FiltroArchivo = {}) =>
    api.get<ResultadoPaginado<Funcionario>>(
      `/archivo${qs({
        q: filtro.q,
        retiroDesde: filtro.retiroDesde,
        retiroHasta: filtro.retiroHasta,
        pagina: filtro.pagina,
      })}`,
    ),
  expediente: (id: string) => api.get<FuncionarioDetalle>(`/archivo/${id}`),
  exportCsv: (filtro: FiltroArchivo = {}) =>
    api.blob(
      `/archivo/export${qs({
        q: filtro.q,
        retiroDesde: filtro.retiroDesde,
        retiroHasta: filtro.retiroHasta,
      })}`,
    ),
}

export const apiCapacitaciones = {
  listar: (filtro: FiltroCapacitaciones = {}) =>
    api.get<ResultadoPaginado<Capacitacion>>(
      `/capacitaciones${qs({
        q: filtro.q,
        ambito: filtro.ambito,
        estado: filtro.estado,
        pagina: filtro.pagina,
      })}`,
    ),
  crear: (input: {
    titulo: string
    ambito: string
    iniciaEn: string
    terminaEn: string
    descripcion?: string
    lugar?: string
    instructor?: string
    horas?: number
  }) => api.post<Capacitacion>("/capacitaciones", input),
  detalle: (id: string) => api.get<CapacitacionDetalle>(`/capacitaciones/${id}`),
  editar: (id: string, input: Partial<Omit<Capacitacion, "id" | "ambito" | "token" | "estadoRegistro" | "creadaPor" | "createdAt" | "updatedAt">>) =>
    request<Capacitacion>("PATCH", `/capacitaciones/${id}`, input),
  abrirRegistro: (id: string) => api.post<Capacitacion>(`/capacitaciones/${id}/registro/abrir`),
  cerrarRegistro: (id: string) => api.post<Capacitacion>(`/capacitaciones/${id}/registro/cerrar`),
  exportarAsistencias: (id: string) => api.blob(`/capacitaciones/${id}/asistencias/export`),
}

/** API pública para el formulario de asistencia (sin auth requerida). */
export const apiRegistro = {
  info: (token: string) =>
    fetch(`${BASE}/capacitaciones/registro/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new ApiError(r.status, (await r.json().catch(() => ({}))).error ?? r.statusText)
        return r.json() as Promise<CapacitacionPublica>
      }),
  registrar: (token: string, datos: RegistrarAsistenciaInput) =>
    fetch(`${BASE}/capacitaciones/registro/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    }).then(async (r) => {
      if (!r.ok) {
        const payload = (await r.json().catch(() => ({}))) as { error?: string }
        throw new ApiError(r.status, payload.error ?? r.statusText)
      }
      return r.json() as Promise<ResultadoRegistro>
    }),
}

/** Ruta del objeto de Storage devuelta por la URL firmada de subida (Sprint 2). */
export interface UrlSubidaFoto {
  path: string
  signedUrl: string
  token: string
}

/** Bucket privado de fotos de empleados (mismo nombre que el backend, deny-directo). */
export const BUCKET_FOTOS_EMPLEADOS = "fotos-empleados"

/** Maestro de empleados (Administración de Personal) — solo SA/TH. */
export const apiPersonal = {
  listar: (filtro: FiltroEmpleados = {}) =>
    api.get<ResultadoPaginado<Empleado>>(
      `/personal${qs({
        q: filtro.q,
        tipoVinculacion: filtro.tipoVinculacion,
        vinculoEstado: filtro.vinculoEstado,
        pagina: filtro.pagina,
        porPagina: filtro.porPagina,
      })}`,
    ),
  detalle: (id: string) => api.get<EmpleadoDetalle>(`/personal/${id}`),
  expediente: (id: string) =>
    api.get<ExpedienteCompleto>(`/personal/${id}/expediente`),
  crear: (input: CrearEmpleadoInput) => api.post<Empleado>("/personal", input),
  editar: (id: string, input: EditarEmpleadoInput) =>
    api.post<Empleado>(`/personal/${id}`, input),
  finalizarContrato: (id: string, fechaRetiro: string) =>
    api.post<ResultadoMutacion>(`/personal/${id}/finalizar-contrato`, { fechaRetiro }),
  registrarNovedad: (id: string, input: RegistrarNovedadInput) =>
    api.post<EmpleadoDetalle>(`/personal/${id}/novedad`, input),

  // ── Hoja de vida 360°: captura por bloque satélite (Sprint 2) ───────────────
  guardarPersonales: (id: string, input: GuardarPersonalesInput) =>
    api.post<DatosPersonales>(`/personal/${id}/personales`, input),
  crearFamiliar: (id: string, input: CrearFamiliarInput) =>
    api.post<Familiar>(`/personal/${id}/familiares`, input),
  eliminarFamiliar: (id: string, familiarId: string) =>
    api.post<void>(`/personal/${id}/familiares/${familiarId}/eliminar`),
  crearFormacion: (id: string, input: CrearFormacionInput) =>
    api.post<Formacion>(`/personal/${id}/formacion`, input),
  eliminarFormacion: (id: string, formacionId: string) =>
    api.post<void>(`/personal/${id}/formacion/${formacionId}/eliminar`),
  crearExperiencia: (id: string, input: CrearExperienciaInput) =>
    api.post<Experiencia>(`/personal/${id}/experiencia`, input),
  eliminarExperiencia: (id: string, experienciaId: string) =>
    api.post<void>(`/personal/${id}/experiencia/${experienciaId}/eliminar`),
  guardarSalarial: (id: string, input: GuardarSalarialInput) =>
    api.post<DatosSalariales>(`/personal/${id}/salarial`, input),
  editarContractual: (id: string, input: EditarContractualInput) =>
    api.post<EmpleadoContractual>(`/personal/${id}/contractual`, input),
  crearUrlSubidaFoto: (id: string, extension: string) =>
    api.post<UrlSubidaFoto>(`/personal/${id}/foto-url`, { extension }),
  guardarFoto: (id: string, fotoPath: string | null) =>
    api.post<EmpleadoContractual>(`/personal/${id}/foto`, { fotoPath }),
  obtenerUrlFoto: (id: string) => api.get<{ url: string } | null>(`/personal/${id}/foto-url`),
}

export const apiUsuarios = {
  listar: (pagina?: number) =>
    api.get<ResultadoPaginado<Usuario>>(`/usuarios${qs({ pagina })}`),
  asignarRol: (input: AsignarRolInput) =>
    api.post<Usuario>(`/usuarios/${input.usuarioId}/rol`, {
      rol: input.rol,
      areaId: input.areaId ?? null,
    }),
  cambiarEstado: (input: CambiarEstadoUsuarioInput) =>
    api.post<Usuario>(`/usuarios/${input.usuarioId}/estado`, { estado: input.estado }),
}
