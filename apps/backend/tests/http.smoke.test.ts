import { describe, it, expect } from "vitest"
import request from "supertest"
import { crearApp } from "../src/interface/app"

// Smoke test del ensamblado HTTP: verifica que routers + requireAuth +
// errorHandler quedaron bien cableados. No toca la base de datos: `requireAuth`
// corta en 401 antes de llegar a cualquier repo.
const app = crearApp()

describe("HTTP smoke", () => {
  it("GET /health → 200 { ok: true }", async () => {
    const res = await request(app).get("/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it("GET /api/health → 200 (alcanzable tras el rewrite de Vercel)", async () => {
    const res = await request(app).get("/api/health")
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it("GET /api/auth/me sin token → 401", async () => {
    const res = await request(app).get("/api/auth/me")
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty("error")
  })

  it("GET /api/funcionarios sin token → 401 (guarda antes que el repo)", async () => {
    const res = await request(app).get("/api/funcionarios")
    expect(res.status).toBe(401)
  })

  it("GET /api/usuarios sin token → 401", async () => {
    const res = await request(app).get("/api/usuarios")
    expect(res.status).toBe(401)
  })
})
