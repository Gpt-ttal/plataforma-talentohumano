import { describe, it, expect } from "vitest"
import { parseEnv } from "../src/config/env"

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_JWT_SECRET: "secret",
}

describe("parseEnv (backend)", () => {
  it("falla si falta DATABASE_URL", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: undefined } as any)).toThrow()
  })
  it("aplica defaults de SUPERADMIN_EMAIL y DOMINIO_PERMITIDO", () => {
    const e = parseEnv(base as any)
    expect(e.SUPERADMIN_EMAIL).toBe("leonardoreales@americana.edu.co")
    expect(e.DOMINIO_PERMITIDO).toBe("americana.edu.co")
  })
  it("rechaza email inválido en SUPERADMIN_EMAIL", () => {
    expect(() => parseEnv({ ...base, SUPERADMIN_EMAIL: "no-es-email" } as any)).toThrow()
  })
  it("usa PORT y WEB_ORIGIN por defecto", () => {
    const e = parseEnv(base as any)
    expect(e.PORT).toBe(3000)
    expect(e.WEB_ORIGIN).toBe("http://localhost:5173")
  })

  describe("endurecimiento de producción (NODE_ENV=production)", () => {
    const prod = {
      DATABASE_URL: "postgresql://user:pass@host:5432/db?sslmode=require",
      SUPABASE_URL: "https://example.supabase.co",
      WEB_ORIGIN: "https://pazysalvo.americana.edu.co",
      NODE_ENV: "production",
    }
    it("acepta una config de producción segura (sin secreto HS256, ssl verificado, origen real)", () => {
      expect(() => parseEnv(prod as any)).not.toThrow()
    })
    it("falla si WEB_ORIGIN sigue en el default localhost", () => {
      expect(() => parseEnv({ ...prod, WEB_ORIGIN: undefined } as any)).toThrow()
    })
    it("falla si DATABASE_URL usa sslmode=no-verify", () => {
      expect(() =>
        parseEnv({
          ...prod,
          DATABASE_URL: "postgresql://user:pass@host:5432/db?sslmode=no-verify",
        } as any),
      ).toThrow()
    })
    it("falla si SUPABASE_JWT_SECRET está presente (se exige asimétrico)", () => {
      expect(() => parseEnv({ ...prod, SUPABASE_JWT_SECRET: "x" } as any)).toThrow()
    })
  })
})
