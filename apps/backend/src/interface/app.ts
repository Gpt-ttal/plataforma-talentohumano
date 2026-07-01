import express from "express"
import helmet from "helmet"
import cors from "cors"
import compression from "compression"
import rateLimit from "express-rate-limit"
import { env } from "../config/env.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { authRouter } from "./routes/auth.routes.js"
import { funcionariosRouter } from "./routes/funcionarios.routes.js"
import { usuariosRouter } from "./routes/usuarios.routes.js"
import { catalogoRouter } from "./routes/catalogo.routes.js"
import { areasRouter } from "./routes/areas.routes.js"
import { archivoRouter } from "./routes/archivo.routes.js"
import { capacitacionesRouter } from "./routes/capacitaciones.routes.js"

/**
 * Ensambla la app Express: hardening (helmet), CORS al origen del frontend,
 * compresión, parseo JSON, rate-limit sobre `/api`, los routers de dominio y,
 * al final, el `errorHandler` que traduce los errores tipados a JSON.
 */
export function crearApp() {
  const app = express()

  // Detrás del proxy de Vercel: confiar en `x-forwarded-for` para que `req.ip` sea
  // la IP real del cliente (no la del proxy) y `express-rate-limit` no emita su
  // ValidationError. Nota: el rate-limit usa store en memoria → es por-instancia
  // serverless, no global. Suficiente como red de seguridad para usuarios internos;
  // un límite global real exigiría un store compartido (fuera de alcance free).
  app.set("trust proxy", 1)

  app.use(helmet())
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }))
  app.use(compression())
  app.use(express.json())

  // Health check. Se expone también bajo `/api/health` porque en Vercel solo las
  // rutas `/api/*` llegan a esta función (el rewrite de vercel.json). Ambas van
  // ANTES del rate-limit para no consumir su presupuesto en sondeos de salud.
  const health = (_req: express.Request, res: express.Response) => res.json({ ok: true })
  app.get("/health", health)
  app.get("/api/health", health)

  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120 }))
  app.use("/api/auth", authRouter)
  app.use("/api/funcionarios", funcionariosRouter)
  app.use("/api/usuarios", usuariosRouter)
  app.use("/api/areas", areasRouter)
  app.use("/api/archivo", archivoRouter)
  app.use("/api/capacitaciones", capacitacionesRouter)
  app.use("/api", catalogoRouter)

  app.use(errorHandler)
  return app
}
