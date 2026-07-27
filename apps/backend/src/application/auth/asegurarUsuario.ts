import type { Usuario } from "@pys/shared"
import {
  decidirAltaUsuario,
  errorInvarianteUsuario,
  normalizarEmail,
} from "@pys/shared"
import type { UsuarioRepo, CrearUsuarioArgs } from "../../domain/ports/UsuarioRepo.js"
import type { PreaprobacionRepo } from "../../domain/ports/PreaprobacionRepo.js"

/** Resultado del alta: usuario creado/existente o rechazo con motivo. */
export type ResultadoAlta =
  | { ok: true; usuario: Usuario }
  | { ok: false; motivo: string }

const MOTIVO_NO_AUTORIZADO =
  "Tu correo no está autorizado para ingresar. Solicita acceso al administrador."

/**
 * Garantiza que exista un `Usuario` para una identidad de Auth (el `uid` de Supabase
 * es la clave compartida). Modelo de acceso por **allowlist** (migración 0022):
 *
 *  1. Si el usuario ya existe → se devuelve (los registrados conservan acceso; no se
 *     consulta la allowlist).
 *  2. El correo de bootstrap (`superadminEmail`) siempre entra como SUPERADMIN/ACTIVO,
 *     aunque no esté en la lista — así el primer SA puede poblarla.
 *  3. Se consulta la allowlist:
 *     - Tabla ausente (0022 sin aplicar) → FALLBACK al autoregistro histórico
 *       (AREA/PENDIENTE), preservando el comportamiento previo (merge-safe).
 *     - Tabla presente con pre-aprobación → se crea con su rol/área/estado.
 *     - Tabla presente sin pre-aprobación → rechazo (403).
 *
 * `superadminEmail` y `dominioPermitido` se inyectan (desde `env` en el composition
 * root) para mantener el caso de uso puro y testeable.
 */
export function asegurarUsuario(deps: {
  repo: UsuarioRepo
  preRepo: PreaprobacionRepo
  superadminEmail: string
  dominioPermitido: string
}) {
  const crear = async (args: CrearUsuarioArgs): Promise<ResultadoAlta> => {
    const violacion = errorInvarianteUsuario({
      rol: args.rol,
      estado: args.estado,
      areaId: args.areaId ?? null,
    })
    if (violacion) return { ok: false, motivo: violacion }
    const usuario = await deps.repo.crearUsuario(args)
    return { ok: true, usuario }
  }

  return async (
    uid: string,
    email: string,
    nombre: string,
  ): Promise<ResultadoAlta> => {
    const existente = await deps.repo.obtenerUsuarioPorId(uid)
    if (existente) return { ok: true, usuario: existente }

    const normalizado = normalizarEmail(email)
    const nombreFinal = nombre.trim() || normalizado

    // Bootstrap del superadmin: entra siempre, antes de tocar la allowlist.
    const decisionDominio = decidirAltaUsuario({
      email,
      nombre,
      superadminEmail: deps.superadminEmail,
      dominioPermitido: deps.dominioPermitido,
    })
    if (decisionDominio.permitido && decisionDominio.rol === "SUPERADMIN") {
      return crear({
        id: uid,
        email: normalizado,
        nombre: nombreFinal,
        rol: "SUPERADMIN",
        areaId: null,
        estado: "ACTIVO",
      })
    }

    const consulta = await deps.preRepo.buscarPorEmail(normalizado)

    // Fallback merge-safe: sin tabla (0022 sin aplicar) → autoregistro histórico.
    if (consulta.tabla === "ausente") {
      if (!decisionDominio.permitido) {
        return { ok: false, motivo: decisionDominio.motivo }
      }
      return crear({
        id: uid,
        email: normalizado,
        nombre: nombreFinal,
        rol: decisionDominio.rol,
        areaId: null,
        estado: decisionDominio.estado,
      })
    }

    // Allowlist activa: solo correos pre-aprobados entran.
    const pre = consulta.preaprobacion
    if (!pre) return { ok: false, motivo: MOTIVO_NO_AUTORIZADO }

    return crear({
      id: uid,
      email: normalizado,
      nombre: nombreFinal,
      rol: pre.rol,
      areaId: pre.areaId,
      estado: pre.estado,
    })
  }
}
