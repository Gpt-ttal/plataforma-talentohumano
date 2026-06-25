// Load-test reproducible (§5.2 del plan): martillea los endpoints calientes con
// ~20 conexiones concurrentes para validar que la app sostiene la carga objetivo
// (~20 usuarios) sin agotar conexiones de Postgres ni degradar la latencia.
//
// Uso:
//   LOADTEST_BASE_URL=https://<preview>.vercel.app \
//   LOADTEST_JWT=<access_token de una sesión real> \
//   LOADTEST_DURATION=20 LOADTEST_CONNECTIONS=20 \
//   npm run loadtest
//
// El JWT se obtiene de una sesión iniciada (DevTools → Application → Local Storage
// → la clave `sb-...-auth-token` → campo `access_token`). El backend exige Bearer.
//
// Sale con código ≠0 si hay respuestas no-2xx, errores o timeouts (gate de CI/manual).

import autocannon from "autocannon"

const BASE = (process.env.LOADTEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "")
const JWT = process.env.LOADTEST_JWT
const CONNECTIONS = Number(process.env.LOADTEST_CONNECTIONS ?? 20)
const DURATION = Number(process.env.LOADTEST_DURATION ?? 20)

if (!JWT) {
  console.error("Falta LOADTEST_JWT (access_token de una sesión real). Ver cabecera del script.")
  process.exit(2)
}

const headers = {
  authorization: `Bearer ${JWT}`,
  "content-type": "application/json",
}

/** Preflight: trae un funcionario real para ejercitar el endpoint de detalle. */
async function obtenerUnFuncionarioId() {
  const res = await fetch(`${BASE}/api/funcionarios?pagina=1&porPagina=1`, { headers })
  if (!res.ok) {
    console.error(`Preflight falló (${res.status}). ¿JWT válido y backend arriba en ${BASE}?`)
    process.exit(2)
  }
  const data = await res.json()
  return data.items?.[0]?.id ?? null
}

const funcionarioId = await obtenerUnFuncionarioId()

// Mezcla representativa del tráfico real del Panel + catálogo + detalle.
const requests = [
  { method: "GET", path: "/api/funcionarios?pagina=1&porPagina=20" },
  { method: "GET", path: "/api/metricas" },
  { method: "GET", path: "/api/auth/me" },
]
if (funcionarioId) {
  requests.push({ method: "GET", path: `/api/funcionarios/${funcionarioId}` })
} else {
  console.warn("Sin funcionarios sembrados: se omite el endpoint de detalle.")
}

console.log(
  `\nLoad-test → ${BASE}  ·  ${CONNECTIONS} conexiones  ·  ${DURATION}s  ·  ${requests.length} endpoints\n`,
)

const instance = autocannon(
  { url: BASE, connections: CONNECTIONS, duration: DURATION, headers, requests },
  (err, result) => {
    if (err) {
      console.error("autocannon error:", err)
      process.exit(1)
    }
    const noOk = result.non2xx
    const errores = result.errors
    const timeouts = result.timeouts
    console.log("\n── Resultado ─────────────────────────────")
    console.log(`Requests:   ${result.requests.total}  (${result.requests.average}/s)`)
    console.log(`Latencia:   p50 ${result.latency.p50}ms · p99 ${result.latency.p99}ms · max ${result.latency.max}ms`)
    console.log(`2xx:        ${result["2xx"]}`)
    console.log(`no-2xx:     ${noOk}   errores: ${errores}   timeouts: ${timeouts}`)
    console.log("──────────────────────────────────────────")

    if (noOk > 0 || errores > 0 || timeouts > 0) {
      console.error("\n❌ Hubo respuestas no-2xx / errores / timeouts: revisar pool de conexiones, rate-limit o autorización.")
      process.exit(1)
    }
    console.log("\n✅ Sin no-2xx, errores ni timeouts.")
  },
)

autocannon.track(instance, { renderProgressBar: true })
