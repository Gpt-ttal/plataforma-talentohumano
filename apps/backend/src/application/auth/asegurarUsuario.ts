import type { Usuario } from "@pys/shared"
import {
  decidirAltaUsuario,
  errorInvarianteUsuario,
  normalizarEmail,
} from "@pys/shared"
import type { UsuarioRepo } from "../../domain/ports/UsuarioRepo.js"

/** Resultado del autoregistro: usuario creado/existente o rechazo con motivo. */
export type ResultadoAlta =
  | { ok: true; usuario: Usuario }
  | { ok: false; motivo: string }

/**
 * Garantiza que exista un `Usuario` para una identidad de Auth (el `uid` de Supabase
 * es la clave compartida). Si ya existe lo devuelve; si no, decide su alta
 * (`decidirAltaUsuario` rechaza fuera del dominio institucional), valida el
 * invariante rol↔área y lo crea.
 *
 * `superadminEmail` y `dominioPermitido` se inyectan (desde `env` en el composition
 * root) para mantener el caso de uso puro y testeable.
 */
export function asegurarUsuario(deps: {
  repo: UsuarioRepo
  superadminEmail: string
  dominioPermitido: string
}) {
  return async (
    uid: string,
    email: string,
    nombre: string,
  ): Promise<ResultadoAlta> => {
    const existente = await deps.repo.obtenerUsuarioPorId(uid)
    if (existente) return { ok: true, usuario: existente }

    const decision = decidirAltaUsuario({
      email,
      nombre,
      superadminEmail: deps.superadminEmail,
      dominioPermitido: deps.dominioPermitido,
    })
    if (!decision.permitido) return { ok: false, motivo: decision.motivo }

    // Invariante de integridad rol↔área (defensa antes de escribir).
    const violacion = errorInvarianteUsuario({
      rol: decision.rol,
      estado: decision.estado,
      areaId: null,
    })
    if (violacion) return { ok: false, motivo: violacion }

    const normalizado = normalizarEmail(email)
    const usuario = await deps.repo.crearUsuario({
      id: uid,
      email: normalizado,
      nombre: nombre.trim() || normalizado,
      rol: decision.rol,
      areaId: null,
      estado: decision.estado,
    })
    return { ok: true, usuario }
  }
}
