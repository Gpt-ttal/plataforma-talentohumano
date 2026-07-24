// Arranque seguro de desarrollo: libera los puertos 3000/5173 si quedaron
// colgados de un arranque anterior (p. ej. alguien corrió `vite` suelto sin el
// backend — el caso que motivó este script), corre el build completo del
// monorepo para comprobar que todo compila, y solo si pasa levanta
// backend+frontend con `npm run dev`.
//
// Uso: npm run dev:safe

import { spawnSync, execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PUERTOS = [3000, 5173]

/** PIDs escuchando (estado LISTENING) en `puerto`, leyendo `netstat -ano`. */
function pidsEscuchando(puerto) {
  const salida = execSync("netstat -ano", { encoding: "utf8" })
  const sufijo = `:${puerto}`
  const pids = new Set()
  for (const linea of salida.split(/\r?\n/)) {
    if (!linea.includes("LISTENING")) continue
    const cols = linea.trim().split(/\s+/)
    if (cols.length < 5) continue
    const direccionLocal = cols[1]
    const pid = cols[cols.length - 1]
    if (direccionLocal.endsWith(sufijo)) pids.add(pid)
  }
  return [...pids]
}

function liberarPuerto(puerto) {
  if (process.platform !== "win32") {
    console.warn(`  · (omitido) liberar puerto ${puerto}: solo implementado para Windows.`)
    return
  }
  let pids = []
  try {
    pids = pidsEscuchando(puerto)
  } catch {
    return // netstat sin resultados para ese puerto — nada que liberar
  }
  for (const pid of pids) {
    if (pid === "0") continue
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" })
      console.log(`  · puerto ${puerto}: proceso ${pid} detenido (arranque anterior colgado)`)
    } catch {
      // ya no existe o sin permiso para matarlo — seguir
    }
  }
}

console.log("→ Liberando puertos 3000 (backend) y 5173 (frontend) si quedaron colgados…")
for (const puerto of PUERTOS) liberarPuerto(puerto)

console.log("\n→ Build completo (shared → backend → web) para comprobar que todo compila…\n")
const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true, cwd: RAIZ })
if (build.status !== 0) {
  console.error("\n✕ El build falló — no se levantan los servidores. Corrige los errores de arriba y vuelve a intentar.")
  process.exit(build.status ?? 1)
}

console.log("\n✓ Build en verde. Levantando backend (:3000) + frontend (:5173)…\n")
const dev = spawnSync("npm", ["run", "dev"], { stdio: "inherit", shell: true, cwd: RAIZ })
process.exit(dev.status ?? 0)
