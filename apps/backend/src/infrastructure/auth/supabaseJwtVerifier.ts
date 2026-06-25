import { jwtVerify, createRemoteJWKSet, type JWTVerifyGetKey } from "jose"
import { env } from "../../config/env.js"

/** Claims que el resto del backend necesita de un JWT de Supabase. */
export interface ClaimsUsuario {
  sub: string
  email: string
  nombre: string
}

/**
 * Conjunto de claves públicas de Supabase Auth (JWKS). El proyecto firma los
 * access tokens con la "Current Key" asimétrica (ES256); `jose` descarga y
 * cachea las claves desde el endpoint estándar y refresca si aparece un `kid`
 * nuevo (rotación de claves sin redeploy).
 */
const jwks = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
)

/** Secreto HS256 legacy (opcional): solo verifica tokens viejos firmados así. */
const secretoLegacy = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null

/** Issuer que Supabase Auth estampa en cada token de este proyecto. */
const ISSUER_ESPERADO = `${env.SUPABASE_URL}/auth/v1`
/** Audience de los access tokens de usuario de Supabase (GoTrue). */
const AUDIENCE_ESPERADA = "authenticated"

/**
 * El fallback HS256 (secreto compartido) solo se admite fuera de producción y
 * cuando hay secreto configurado. En producción se exige firma asimétrica
 * (JWKS/ES256): así se cierra el "algorithm confusion" — un atacante no puede
 * forzar la rama del secreto compartido eligiendo `alg: "HS256"` en el header.
 */
function hs256Permitido(): boolean {
  return secretoLegacy !== null && process.env.NODE_ENV !== "production"
}

/**
 * Resuelve la clave de verificación según el algoritmo del token:
 *  - HS256  → secreto compartido legacy (solo si `hs256Permitido()`).
 *  - resto  → clave pública del JWKS (ES256/RS256, firma asimétrica actual).
 */
const resolverClave: JWTVerifyGetKey = (header, token) => {
  if (header.alg === "HS256") {
    if (!hs256Permitido()) {
      throw new Error("Verificación HS256 no permitida: use firma asimétrica (JWKS).")
    }
    return secretoLegacy as Uint8Array
  }
  return jwks(header, token)
}

/**
 * Verifica la firma de un JWT emitido por Supabase Auth. Exige firma válida,
 * `exp` vigente, `iss` de ESTE proyecto Supabase, `aud: "authenticated"` y un
 * algoritmo de la allowlist. Soporta la firma asimétrica actual (ES256, vía
 * JWKS) y, fuera de producción, la HS256 legacy. Lanza si algo no cuadra.
 *
 * El `nombre` es best-effort: Supabase lo guarda en `user_metadata.full_name`
 * (o `name`); si no viene, se deja vacío y el autoregistro cae al email.
 */
export async function verificarJwt(token: string): Promise<ClaimsUsuario> {
  const algorithms = hs256Permitido()
    ? ["ES256", "RS256", "HS256"]
    : ["ES256", "RS256"]
  const { payload } = await jwtVerify(token, resolverClave, {
    issuer: ISSUER_ESPERADO,
    audience: AUDIENCE_ESPERADA,
    algorithms,
  })

  const metadata =
    (payload.user_metadata as Record<string, unknown> | undefined) ?? {}
  const nombre = String(
    metadata.full_name ?? metadata.name ?? payload.name ?? "",
  )

  return {
    sub: String(payload.sub ?? ""),
    email: String(payload.email ?? ""),
    nombre,
  }
}
