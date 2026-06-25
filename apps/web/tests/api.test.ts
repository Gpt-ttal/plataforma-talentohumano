import { describe, it, expect, vi, afterEach } from "vitest"

// Mock del cliente Supabase: evita createClient real y fija un access_token.
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { access_token: "tok-123" } } }),
    },
  },
}))

import { api, ApiError } from "../src/lib/api"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("api client", () => {
  it("adjunta Authorization: Bearer y parsea el JSON de respuesta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const r = await api.get<{ ok: boolean }>("/auth/me")

    expect(r).toEqual({ ok: true })
    const llamada = fetchMock.mock.calls.at(0)
    expect(llamada).toBeDefined()
    const [url, init] = llamada as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe("Bearer tok-123")
    expect(url).toBe("/api/auth/me")
  })

  it("lanza ApiError con el status en una respuesta no-ok (403)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ error: "No autorizado" }),
      }),
    )

    await expect(api.get("/funcionarios")).rejects.toBeInstanceOf(ApiError)
    await expect(api.get("/funcionarios")).rejects.toMatchObject({
      status: 403,
      message: "No autorizado",
    })
  })
})
