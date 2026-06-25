import { describe, it, expect, vi, afterEach } from "vitest"
import { SignJWT } from "jose"
import { verificarJwt } from "../src/infrastructure/auth/supabaseJwtVerifier"

// El secreto de prueba lo fija tests/setup.ts (SUPABASE_JWT_SECRET); el
// SUPABASE_URL también, y de él se deriva el issuer esperado.
const secreto = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
const ISSUER = `${process.env.SUPABASE_URL}/auth/v1`

/**
 * Firma un token de prueba HS256. Por defecto incluye el `iss` y el `aud`
 * ("authenticated") que Supabase emite y que el verificador ahora exige; las
 * pruebas que validan el rechazo los sobreescriben.
 */
async function firmar(
  claims: Record<string, unknown>,
  opts: { secreto?: Uint8Array; issuer?: string | null; audience?: string | null } = {},
): Promise<string> {
  const { secreto: sec = secreto, issuer = ISSUER, audience = "authenticated" } = opts
  let jwt = new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h")
  if (issuer !== null) jwt = jwt.setIssuer(issuer)
  if (audience !== null) jwt = jwt.setAudience(audience)
  return jwt.sign(sec)
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("verificarJwt (Supabase)", () => {
  it("verifica un token válido (iss/aud correctos) y devuelve sub/email/nombre", async () => {
    const token = await firmar({
      sub: "uid-123",
      email: "ana@americana.edu.co",
      user_metadata: { full_name: "Ana Pérez" },
    })
    const r = await verificarJwt(token)
    expect(r.sub).toBe("uid-123")
    expect(r.email).toBe("ana@americana.edu.co")
    expect(r.nombre).toBe("Ana Pérez")
  })

  it("rechaza un token firmado con otro secreto", async () => {
    const otro = new TextEncoder().encode("secreto-impostor")
    const token = await firmar({ sub: "x", email: "x@americana.edu.co" }, { secreto: otro })
    await expect(verificarJwt(token)).rejects.toBeTruthy()
  })

  it("rechaza un token malformado", async () => {
    await expect(verificarJwt("no-es-un-jwt")).rejects.toBeTruthy()
  })

  it("rechaza un token sin audience (aud)", async () => {
    const token = await firmar({ sub: "x", email: "x@americana.edu.co" }, { audience: null })
    await expect(verificarJwt(token)).rejects.toBeTruthy()
  })

  it("rechaza un token con audience ajena", async () => {
    const token = await firmar({ sub: "x", email: "x@americana.edu.co" }, { audience: "otra-api" })
    await expect(verificarJwt(token)).rejects.toBeTruthy()
  })

  it("rechaza un token con issuer ajeno (otro proyecto Supabase)", async () => {
    const token = await firmar(
      { sub: "x", email: "x@americana.edu.co" },
      { issuer: "https://proyecto-impostor.supabase.co/auth/v1" },
    )
    await expect(verificarJwt(token)).rejects.toBeTruthy()
  })

  it("en producción rechaza la firma HS256 legacy (solo asimétrica)", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const token = await firmar({ sub: "x", email: "x@americana.edu.co" })
    // Con NODE_ENV=production el fallback HS256 queda deshabilitado aunque el
    // secreto esté configurado → algorithm-confusion cerrado.
    await expect(verificarJwt(token)).rejects.toBeTruthy()
  })
})
